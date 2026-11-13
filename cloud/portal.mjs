import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { openDb, register, session, currentAccount, digest, checkPassword, hashPassword, audit } from './core.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const origin=process.env.CLOUD_ORIGIN || 'https://papermarketing.cloud';
const db=openDb(process.env.CLOUD_DB || '/var/lib/papermarketing-cloud/control.sqlite');
const dummyHash=hashPassword('unused-placeholder-secret');
function notify() {
  const socket=createConnection(process.env.CLOUD_SOCKET || '/run/papermarketing-worker/wake.sock');
  socket.on('connect',()=>socket.end());
  socket.on('error',()=>{}); // Durable queue is recovered by the worker on startup/status.
  socket.setTimeout(1000,()=>socket.destroy());
}
function limited(key) {
  const now=Date.now();
  db.prepare('DELETE FROM limits WHERE until<?').run(now);
  db.prepare('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+900000);
  return db.prepare('SELECT count FROM limits WHERE key=?').get(key).count>12;
}
function reply(res,status,data,cookie) {
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})});
  res.end(JSON.stringify(data));
}
function cookie(value,max=86400) {return `pm_session=${value}; Path=/api/cloud; HttpOnly; Secure; SameSite=Strict; Max-Age=${max}`;}
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const path=new URL(req.url,origin).pathname;
  const secret=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('pm_session='))?.slice(11);
  try {
    if(req.method==='GET'&&path==='/api/cloud/health')return reply(res,200,{status:'ok',registration:'invite-only'});
    if(req.method==='GET'&&path==='/api/cloud/account') {
      const a=currentAccount(db,secret);
      if(!a)return reply(res,401,{error:'Please sign in.'});
      if(a.status==='queued')notify();
      return reply(res,200,{email:a.email,name:a.name,slug:a.slug,status:a.status,url:a.status==='ready'?`https://${a.slug}.${new URL(origin).hostname}`:null,error:a.error});
    }
    if(req.method==='POST'&&path.startsWith('/api/cloud/')) {
      if(req.headers.origin!==origin)return reply(res,403,{error:'Origin rejected.'});
      if(!String(req.headers['content-type']).startsWith('application/json'))return reply(res,415,{error:'JSON required.'});
      const ip=req.headers['x-forwarded-for']?.split(',')[0].trim()||req.socket.remoteAddress;
      if(limited(digest(ip)))return reply(res,429,{error:'Too many attempts. Try again in 15 minutes.'});
      let data='';
      for await(const chunk of req) {data+=chunk;if(Buffer.byteLength(data)>4096)return reply(res,413,{error:'Request too large.'});}
      const input=JSON.parse(data);
      if(path==='/api/cloud/register') {
        const id=register(db,input,{publicKey:process.env.CLOUD_PUBLIC_KEY||'/etc/papermarketing-cloud/public.pem',maxAccounts:Number(process.env.CLOUD_MAX_ACCOUNTS||2)});
        notify();return reply(res,202,{status:'queued'},cookie(session(db,id)));
      }
      if(path==='/api/cloud/login') {
        if(typeof input.email!=='string'||typeof input.password!=='string'||input.password.length>128)return reply(res,400,{error:'Invalid sign-in.'});
        const a=db.prepare('SELECT * FROM accounts WHERE email=?').get(input.email.toLowerCase().trim());
        const valid=checkPassword(input.password,a?.password||dummyHash);
        if(!a||!valid)return reply(res,401,{error:'Email or password is incorrect.'});
        audit(db,'account.login',a.id);return reply(res,200,{ok:true},cookie(session(db,a.id)));
      }
      if(path==='/api/cloud/logout') {db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(secret||''));return reply(res,200,{ok:true},cookie('',0));}
      return reply(res,404,{error:'Not found.'});
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return reply(res,405,{error:'Method not allowed.'});
    const files={'/':'index.html','/console':'console.html','/style.css':'style.css','/brand-tokens.css':'brand-tokens.css','/console.js':'console.js','/brand.svg':'brand.svg','/privacy':'privacy.html','/robots.txt':'robots.txt','/fonts/InterVariable.woff2':'fonts/InterVariable.woff2'};
    if(!files[path])return reply(res,404,{error:'Not found.'});
    const types={html:'text/html; charset=utf-8',css:'text/css',js:'text/javascript',svg:'image/svg+xml',txt:'text/plain',woff2:'font/woff2'};
    let body=readFileSync(resolve(root,'site',files[path]));
    if(files[path].endsWith('.html'))body=Buffer.from(body.toString().replace(/(href|src)="\/(style\.css|console\.js)"/g,(_,attribute,file)=>`${attribute}="/${file}?v=${digest(readFileSync(resolve(root,'site',file))).slice(0,12)}"`));
    res.writeHead(200,{'Content-Type':types[files[path].split('.').at(-1)],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
  } catch(error) {
    const safe=/invitation|password of|Pilot capacity/.test(error.message)?error.message:'The request could not be completed. Please check your details or contact the operator.';
    reply(res,400,{error:safe});
  }
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.CLOUD_PORT||8090),'127.0.0.1',()=>console.log('PaperMarketing portal listening on loopback'));
