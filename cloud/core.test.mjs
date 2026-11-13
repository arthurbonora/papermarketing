import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, privateDecrypt, constants } from 'node:crypto';
import { openDb, invite, register, session, currentAccount, checkPassword, validSlug } from './core.mjs';

test('invitations are email-bound, single-use, atomic and capacity-limited; sessions are tenant-scoped',()=>{
  const dir=mkdtempSync(join(tmpdir(),'pm-cloud-'));
  const db=openDb(join(dir,'test.sqlite'));
  const keys=generateKeyPairSync('rsa',{modulusLength:2048});
  const publicKey=join(dir,'public.pem');writeFileSync(publicKey,keys.publicKey.export({type:'spki',format:'pem'}));
  const config={publicKey,maxAccounts:2};
  const input={email:'first@example.test',name:'First',password:'a-long-secret-password'};
  try {
    const first=invite(db,{email:input.email,slug:'first-team',name:'First Team'});
    assert.throws(()=>register(db,{...input,email:'wrong@example.test',invite:first},config),/invitation/);
    assert.equal(db.prepare('SELECT used FROM invites').get().used,0);
    const id=register(db,{...input,invite:first},config);
    assert.throws(()=>register(db,{...input,invite:first},config),/invitation/);
    const a=db.prepare('SELECT * FROM accounts WHERE id=?').get(id);
    assert.notEqual(a.password,input.password);assert.ok(checkPassword(input.password,a.password));
    assert.ok(!checkPassword('wrong',a.password));
    assert.equal(privateDecrypt({key:keys.privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(a.sealed,'base64')).toString(),input.password);
    const second=invite(db,{email:'second@example.test',slug:'second-team',name:'Second Team'});
    const id2=register(db,{...input,email:'second@example.test',invite:second},config);
    const session1=session(db,id),session2=session(db,id2);
    assert.equal(currentAccount(db,session1).slug,'first-team');
    assert.equal(currentAccount(db,session2).slug,'second-team');
    assert.equal(currentAccount(db,'invalid'),undefined);
    const third=invite(db,{email:'third@example.test',slug:'third-team',name:'Third Team'});
    assert.throws(()=>register(db,{...input,email:'third@example.test',invite:third},config),/capacity/);
    assert.equal(db.prepare('SELECT used FROM invites WHERE slug=?').get('third-team').used,0);
    db.prepare('UPDATE sessions SET expires=0').run();assert.equal(currentAccount(db,session1),undefined);
    assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE event='account.registered'").get().n,2);
  } finally {db.close();rmSync(dir,{recursive:true});}
});
test('tenant identifiers cannot escape paths or inject Compose/proxy syntax',()=>{
  for(const slug of ['../root','foo/bar','abc\nadmin','www','api','a','A-valid','$(id)','foo;id'])assert.equal(validSlug(slug),false);
  assert.equal(validSlug('bonorasw'),true);
});
