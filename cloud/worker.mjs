import { createServer } from 'node:net';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, unlinkSync, chmodSync, statfsSync } from 'node:fs';
import { privateDecrypt, constants, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { openDb, validSlug, audit } from './core.mjs';

const base=process.env.CLOUD_ROOT||'/opt/papermarketing';
const domain=process.env.CLOUD_DOMAIN||'papermarketing.cloud';
const image=process.env.CLOUD_IMAGE;
if(!image||!/^[a-zA-Z0-9/_.:@-]+$/.test(image))throw Error('CLOUD_IMAGE is required');
const db=openDb(process.env.CLOUD_DB||'/var/lib/papermarketing-cloud/control.sqlite');
const socketPath=process.env.CLOUD_SOCKET||'/run/papermarketing-worker/wake.sock';
const privateKey=readFileSync('/etc/papermarketing-cloud/private.pem');
function run(command,args,options={}) {return execFileSync(command,args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:300000,...options});}
function atomic(path,content,mode=0o600) {writeFileSync(path+'.tmp',content,{mode});renameSync(path+'.tmp',path);}
function settings(account) {
  if(!validSlug(account.slug)||!Number.isSafeInteger(account.id)||account.id<1||account.id>1000)throw Error('Invalid tenant identity');
  const dir=`${base}/tenants/${account.slug}`;
  mkdirSync(dir,{recursive:true,mode:0o700});
  const file=`${dir}/secrets.json`;
  if(!existsSync(file))atomic(file,JSON.stringify({db:randomBytes(32).toString('hex'),auth:randomBytes(32).toString('hex'),signing:randomBytes(32).toString('hex')}));
  return {dir,secrets:JSON.parse(readFileSync(file)),port:32000+account.id};
}
function composeFile(a,publicMode) {
  const {dir,secrets,port}=settings(a);
  // JSON is a YAML subset. Never interpolate customer input into shell or YAML.
  const hardening={restart:'unless-stopped',logging:{driver:'json-file',options:{'max-size':'10m','max-file':'3'}}};
  const compose={name:`pm-${a.slug}`,services:{
    db:{...hardening,image:'postgres:17.6-bookworm',mem_limit:'512m',cpus:0.5,pids_limit:256,environment:{POSTGRES_USER:'papermarketing',POSTGRES_DB:'papermarketing',POSTGRES_PASSWORD:secrets.db},volumes:['database:/var/lib/postgresql/data'],healthcheck:{test:['CMD-SHELL','pg_isready -U papermarketing -d papermarketing'],interval:'5s',timeout:'5s',retries:30}},
    app:{...hardening,image,mem_limit:'2560m',cpus:1,pids_limit:512,stop_grace_period:'90s',security_opt:['no-new-privileges:true'],depends_on:{db:{condition:'service_healthy'}},ports:[`127.0.0.1:${port}:3100`],environment:{HOST:'0.0.0.0',PORT:'3100',SERVE_UI:'true',DATABASE_URL:`postgresql://papermarketing:${secrets.db}@db:5432/papermarketing`,PAPERCLIP_HOME:'/paperclip',PAPERCLIP_DEPLOYMENT_MODE:'authenticated',PAPERCLIP_DEPLOYMENT_EXPOSURE:publicMode?'public':'private',PAPERCLIP_PUBLIC_URL:publicMode?`https://${a.slug}.${domain}`:`http://localhost:${port}`,PAPERCLIP_ALLOWED_HOSTNAMES:publicMode?`${a.slug}.${domain}`:'localhost,127.0.0.1',PAPERCLIP_AUTH_DISABLE_SIGN_UP:publicMode?'true':'false',PAPERCLIP_ALLOW_ISOLATED_PROVIDER_LOGIN:'true',PAPERCLIP_MIGRATION_AUTO_APPLY:'true',PAPERCLIP_TELEMETRY_DISABLED:'1',BETTER_AUTH_SECRET:secrets.auth,PAPERCLIP_TOOL_ACTION_SIGNING_SECRET:secrets.signing},volumes:['application:/paperclip'],healthcheck:{test:['CMD','node','-e',"fetch('http://127.0.0.1:3100/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"],interval:'10s',timeout:'5s',start_period:'120s',retries:30}}
  },volumes:{database:{},application:{}}};
  atomic(`${dir}/compose.json`,JSON.stringify(compose,null,2));
  return {dir,port,compose:(...args)=>run('docker',['compose','-f',`${dir}/compose.json`,...args])};
}
async function health(port) {
  for(let i=0;i<180;i++) {
    try {const r=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(3000)});if(r.ok)return await r.json();}catch{}
    await delay(2000);
  }
  throw Error('Tenant health deadline exceeded');
}
async function bootstrap(a,port) {
  const password=privateDecrypt({key:privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(a.sealed,'base64')).toString();
  // Private auth normalizes loopback origins to the container's listen port.
  // Connect through the published port, but keep Host and Origin at port 3100.
  const origin='http://localhost:3100';
  let cookies='';
  async function api(path,body) {
    const r=await fetch(`http://127.0.0.1:${port}/api${path}`,{method:body===undefined?'GET':'POST',headers:{Host:'localhost:3100',Origin:origin,'Content-Type':'application/json',...(cookies?{Cookie:cookies}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
    const next=r.headers.getSetCookie();if(next.length)cookies=next.map(v=>v.split(';')[0]).join('; ');
    let data;try{data=await r.json();}catch{data=null;}
    return {r,data};
  }
  let login=await api('/auth/sign-in/email',{email:a.email,password});
  if(!login.r.ok)login=await api('/auth/sign-up/email',{email:a.email,password,name:a.name});
  if(!login.r.ok||!cookies)throw Error('Tenant account setup failed');
  const claimed=await api('/bootstrap/claim',{});
  if(![200,201,409].includes(claimed.r.status))throw Error('Tenant ownership claim failed');
  const companies=await api('/companies');
  if(!companies.r.ok||!Array.isArray(companies.data))throw Error('Tenant ownership not established');
  if(!companies.data.length) {
    const workspace=await api('/companies',{name:db.prepare('SELECT name FROM invites WHERE slug=?').get(a.slug)?.name||a.name});
    if(!workspace.r.ok)throw Error('Workspace setup failed');
  }
  db.prepare('UPDATE accounts SET bootstrapped=1,sealed=NULL WHERE id=?').run(a.id);
}
async function provision(a) {
  const stats=statfsSync(base);
  if(stats.bavail*stats.bsize<10*1024**3)throw Error('Insufficient disk reserve');
  run('docker',['image','inspect',image]);
  const s=composeFile(a,Boolean(a.bootstrapped));
  s.compose('up','-d','--wait','--wait-timeout','360');
  await health(s.port);
  if(!a.bootstrapped) {
    await bootstrap(a,s.port);
    composeFile(a,true).compose('up','-d','--wait','--wait-timeout','360');
  }
  const h=await health(s.port);
  if(h.deploymentMode!=='authenticated')throw Error('Authenticated deployment required');
  const denied=await fetch(`http://127.0.0.1:${s.port}/api/companies`,{headers:{Host:`${a.slug}.${domain}`},signal:AbortSignal.timeout(10000)});
  if(![401,403].includes(denied.status))throw Error('Anonymous access must be denied');
  const routes=`${base}/edge/tenants`;
  mkdirSync(routes,{recursive:true});
  atomic(`${routes}/${a.slug}.caddy`,`${a.slug}.${domain} {\n encode zstd gzip\n header Referrer-Policy no-referrer\n reverse_proxy 127.0.0.1:${s.port}\n}\n`,0o644);
  run('docker',['exec','papermarketing-edge','caddy','validate','--config','/etc/caddy/Caddyfile']);
  run('docker',['exec','papermarketing-edge','caddy','reload','--config','/etc/caddy/Caddyfile']);
  db.prepare("UPDATE accounts SET status='ready',error=NULL WHERE id=?").run(a.id);
  audit(db,'tenant.ready',a.id,a.slug);
}
let busy=false;
async function drain() {
  if(busy)return;busy=true;
  try {
    for(;;) {
      const a=db.prepare("SELECT * FROM accounts WHERE status IN ('queued','provisioning') ORDER BY id LIMIT 1").get();
      if(!a)break;
      try {run('docker',['image','inspect',image]);}catch {console.log('Waiting for the configured application image');break;}
      db.prepare("UPDATE accounts SET status='provisioning',error=NULL WHERE id=?").run(a.id);
      audit(db,'tenant.provisioning',a.id);
      try {await provision(a);}catch(error) {
        // Never log command output: Compose errors can contain credentials.
        console.error(`Provisioning failed for account ${a.id}: ${error.message.split('\n')[0].slice(0,100)}`);
        db.prepare("UPDATE accounts SET status='failed',error=? WHERE id=?").run('Setup needs operator attention. Your account is saved; please contact support.',a.id);
        audit(db,'tenant.failed',a.id);
      }
    }
  } finally {busy=false;}
}
if(existsSync(socketPath))unlinkSync(socketPath);
const server=createServer(s=>{s.destroy();void drain();});
server.listen(socketPath,()=>{chmodSync(socketPath,0o660);void drain();});
