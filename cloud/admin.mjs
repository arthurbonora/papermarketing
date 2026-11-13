import { openDb, invite, audit, validSlug } from './core.mjs';
import { createConnection } from 'node:net';
const db=openDb(process.env.CLOUD_DB||'/var/lib/papermarketing-cloud/control.sqlite');
const [command,...args]=process.argv.slice(2);
if(command==='invite') {
  const [email,slug,name]=args;
  const secret=invite(db,{email,slug,name});
  console.log(`https://${process.env.CLOUD_DOMAIN||'papermarketing.cloud'}/console#invite=${secret}`);
} else if(command==='list') {
  console.log(JSON.stringify(db.prepare('SELECT id,email,slug,status,created,error FROM accounts').all(),null,2));
} else if(command==='retry') {
  const [slug]=args;if(!validSlug(slug))throw Error('Invalid slug');
  const a=db.prepare("SELECT * FROM accounts WHERE slug=? AND status='failed'").get(slug);
  if(!a)throw Error('No failed tenant');
  db.prepare("UPDATE accounts SET status='queued',error=NULL WHERE id=?").run(a.id);audit(db,'tenant.retry',a.id);
  const s=createConnection('/run/papermarketing-worker/wake.sock');s.on('connect',()=>s.end());
  s.on('error',()=>{console.error('Retry is queued; start the worker to resume.');process.exitCode=1;});
} else throw Error('Usage: admin.mjs invite EMAIL SLUG NAME | list | retry SLUG');
