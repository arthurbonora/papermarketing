import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
const source=readFileSync('ui/src/index.css','utf8');
const names=['agent-2a','agent-2b','agent-5a','agent-5b','agent-9a','agent-9b','offline-background','offline-foreground','offline-muted','offline-control','offline-border'];
const tokens=names.map(name=>{
  const value=source.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];
  if(!value)throw Error(`Missing brand token ${name}`);
  return `  --${name}: ${value};`;
});
writeFileSync('cloud/site/brand-tokens.css',`/* Generated from ui/src/index.css by cloud/sync-brand.mjs. */\n:root {\n${tokens.join('\n')}\n}\n`);
mkdirSync('cloud/site/fonts',{recursive:true});
for(const name of ['InterVariable.woff2','NOTICE.md'])copyFileSync(`ui/public/fonts/${name}`,`cloud/site/fonts/${name}`);
copyFileSync('ui/public/brands/papermarketing.svg','cloud/site/brand.svg');
