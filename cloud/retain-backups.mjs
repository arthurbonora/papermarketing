import { readdirSync, existsSync, lstatSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { validSlug } from './core.mjs';
const root='/opt/papermarketing/backups';
for(const tenant of readdirSync(root,{withFileTypes:true})) {
  if(!tenant.isDirectory()||!validSlug(tenant.name))continue;
  const dir=join(root,tenant.name);
  const snapshots=readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{8}T\d{6}Z$/.test(e.name)&&existsSync(join(dir,e.name,'COMPLETE'))).map(e=>e.name).sort().reverse();
  for(const name of snapshots.slice(7)) {
    const target=resolve(dir,name);
    if(!target.startsWith(resolve(root)+'/')||lstatSync(target).isSymbolicLink())throw Error('Unsafe backup path');
    rmSync(target,{recursive:true});
  }
}
