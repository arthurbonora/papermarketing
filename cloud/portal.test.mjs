import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { openDb, invite } from './core.mjs';

test('HTTP registration enforces origin, invitation, cookie authentication, request bounds and logout',async()=>{
  const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
  const dir=mkdtempSync(join(tmpdir(),'pm-portal-'));
  const dbPath=join(dir,'db.sqlite'),keyPath=join(dir,'public.pem');
  writeFileSync(keyPath,generateKeyPairSync('rsa',{modulusLength:2048}).publicKey.export({type:'spki',format:'pem'}));
  const db=openDb(dbPath);
  const invitation=invite(db,{email:'pilot@example.test',slug:'pilot-team',name:'Pilot'});
  const origin=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['cloud/portal.mjs'],{env:{...process.env,CLOUD_PORT:String(port),CLOUD_DB:dbPath,CLOUD_PUBLIC_KEY:keyPath,CLOUD_ORIGIN:origin,CLOUD_SOCKET:join(dir,'no-worker.sock')},stdio:'pipe'});
  const exit=once(child,'exit');
  try {
    let ready=false;
    for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/cloud/health')).ok){ready=true;break;}}catch{}await delay(50);}
    assert.ok(ready,'portal must start');
    const payload={email:'pilot@example.test',name:'Pilot',password:'very-long-test-secret',invite:invitation};
    const post=(path,body,headers={})=>fetch(origin+'/api/cloud/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    assert.equal((await post('register',payload,{Origin:'https://evil.example'})).status,403);
    assert.equal((await fetch(origin+'/api/cloud/account')).status,401);
    assert.equal((await post('register',{...payload,email:'other@example.test'})).status,400);
    const registration=await post('register',payload);assert.equal(registration.status,202);
    const setCookie=registration.headers.get('set-cookie');assert.match(setCookie,/HttpOnly; Secure; SameSite=Strict/);
    const cookie=setCookie.split(';')[0];
    const account=await fetch(origin+'/api/cloud/account',{headers:{Cookie:cookie}});const data=await account.json();
    assert.equal(data.slug,'pilot-team');assert.equal(data.status,'queued');assert.equal(data.password,undefined);assert.equal(data.sealed,undefined);
    assert.equal((await post('register',payload)).status,400);
    assert.equal((await post('login',{email:payload.email,password:'wrong-password'})).status,401);
    assert.equal((await post('login',payload)).status,200);
    assert.equal((await post('logout',{}, {Cookie:cookie})).status,200);
    assert.equal((await fetch(origin+'/api/cloud/account',{headers:{Cookie:cookie}})).status,401);
    assert.equal((await post('login',{large:'x'.repeat(5000)})).status,413);
    assert.equal((await fetch(origin+'/missing')).status,404);
    assert.equal((await fetch(origin+'/')).headers.get('x-frame-options'),'DENY');
    db.prepare('DELETE FROM limits').run();
    for(let i=0;i<12;i++)assert.equal((await post('login',{email:payload.email,password:'wrong-password'})).status,401);
    assert.equal((await post('login',payload)).status,429);
  }finally {child.kill();await exit;db.close();rmSync(dir,{recursive:true});}
});
