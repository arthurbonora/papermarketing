import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, scryptSync, timingSafeEqual, publicEncrypt, constants } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export function validSlug(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{2,30}$/.test(value) && !['www','api','admin','mail','console','status'].includes(value);
}
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}
export function openDb(path) {
  mkdirSync(dirname(path), {recursive:true, mode:0o750});
  const created=!existsSync(path);
  const db = new DatabaseSync(path);
  if(created)chmodSync(path,0o660);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS invites (hash TEXT PRIMARY KEY,email TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,name TEXT NOT NULL,expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'queued',sealed TEXT,bootstrapped INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,error TEXT);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY,account INTEGER NOT NULL REFERENCES accounts(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY,at INTEGER NOT NULL,event TEXT NOT NULL,account INTEGER,detail TEXT);
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);`);
  return db;
}
export function audit(db,event,account=null,detail=null) {
  db.prepare('INSERT INTO audit(at,event,account,detail) VALUES(?,?,?,?)').run(Date.now(),event,account,detail);
}
export function invite(db,{email,slug,name,days=7}) {
  if (!validSlug(slug) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length>80) throw Error('Invalid invitation details');
  const secret=token();
  db.prepare('INSERT INTO invites(hash,email,slug,name,expires) VALUES(?,?,?,?,?)').run(digest(secret),email.toLowerCase(),slug,name,Date.now()+days*86400000);
  audit(db,'invite.created',null,slug);
  return secret;
}
export function register(db,input,{publicKey,maxAccounts=2}) {
  const {email,password,name,invite:secret}=input;
  if(typeof email!=='string'||email.length>254||typeof name!=='string'||!name.trim()||name.length>80||typeof password!=='string'||password.length<12||Buffer.byteLength(password)>128||typeof secret!=='string'||secret.length>100) throw Error('Use a valid invitation, name, email and a password of 12–128 bytes.');
  const normalized=email.trim().toLowerCase();
  const hashed=hashPassword(password);
  const sealed=publicEncrypt({key:readFileSync(publicKey),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(password)).toString('base64');
  db.exec('BEGIN IMMEDIATE');
  try {
    const invitation=db.prepare('SELECT * FROM invites WHERE hash=? AND used=0 AND expires>? AND email=?').get(digest(secret),Date.now(),normalized);
    if(!invitation) throw Error('This invitation is invalid, expired, or belongs to another email.');
    if(db.prepare('SELECT count(*) AS n FROM accounts').get().n>=maxAccounts) throw Error('Pilot capacity is full. Please contact the operator.');
    const result=db.prepare('INSERT INTO accounts(email,name,password,slug,sealed,created) VALUES(?,?,?,?,?,?)').run(normalized,name.trim(),hashed,invitation.slug,sealed,Date.now());
    db.prepare('UPDATE invites SET used=1 WHERE hash=? AND used=0').run(invitation.hash);
    audit(db,'account.registered',Number(result.lastInsertRowid),invitation.slug);
    db.exec('COMMIT');
    return Number(result.lastInsertRowid);
  } catch(error) {db.exec('ROLLBACK');throw error;}
}
export function session(db,account) {
  const secret=token();
  db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(secret),account,Date.now()+86400000);
  return secret;
}
export function currentAccount(db,secret) {
  if(!secret)return null;
  return db.prepare('SELECT a.* FROM accounts a JOIN sessions s ON a.id=s.account WHERE s.hash=? AND s.expires>?').get(digest(secret),Date.now());
}
