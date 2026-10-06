// SPDX-License-Identifier: GPL-3.0-or-later
import { readdir, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createZip } from './zip.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)), dist=resolve(root,'dist');
async function files(dir) {
  const result=[];
  for (const entry of (await readdir(resolve(root,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
    const path=`${dir}/${entry.name}`;
    if(entry.isDirectory()) result.push(...await files(path));
    else if(entry.isFile()) result.push(path);
    else throw new Error(`Unsupported source entry ${path}`);
  }
  return result;
}
await mkdir(dist,{recursive:true});
const top=['index.html','license.html','LICENSE','NOTICE.md'];
const site=[...top,...await files('src'),...await files('vendor')];
for (const path of site) { const target=resolve(dist,path); await mkdir(dirname(target),{recursive:true}); await copyFile(resolve(root,path),target); }
const source=[...site,'.gitignore','README.md','package.json','server.mjs',...await files('docs'),...await files('.github'),...await files('scripts'),...await files('tests')];
const entries=await Promise.all(source.map(async name=>({name:`ModProver/${name}`,data:await readFile(resolve(root,name))})));
const manifest=entries.map(({name,data})=>`${createHash('sha256').update(data).digest('hex')}  ${name}`).join('\n')+'\n';
entries.push({name:'ModProver/SHA256SUMS',data:Buffer.from(manifest)});
await writeFile(resolve(dist,'source.zip'),createZip(entries));
console.log(`Built ${site.length} website files and complete corresponding source in dist/.`);
