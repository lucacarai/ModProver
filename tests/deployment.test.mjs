import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../server.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { inflateRawSync } from 'node:zlib';
test('upstream GPL sources match pinned unmodified checksums',async()=>{
  const metadata=JSON.parse(await readFile(new URL('../vendor/engines.json',import.meta.url)));
  for (const engine of metadata.engines) {
    const data=await readFile(new URL(`../vendor/${engine.file}`,import.meta.url));
    assert.equal(createHash('sha256').update(data).digest('hex'),engine.sha256);
    assert.match(data.toString(),/License:\s+GNU General Public License/);
  }
});
test('static build works beneath a subfolder and bundles exact corresponding source',async()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  await promisify(execFile)(process.execPath,['scripts/build.mjs'],{cwd:root});
  const zip=await readFile(new URL('../dist/source.zip',import.meta.url));
  const archive=new Map(); let offset=0;
  while(zip.readUInt32LE(offset)===0x04034b50) {
    const packed=zip.readUInt32LE(offset+18), nameLength=zip.readUInt16LE(offset+26), extra=zip.readUInt16LE(offset+28);
    const name=zip.subarray(offset+30,offset+30+nameLength).toString();
    const start=offset+30+nameLength+extra;
    archive.set(name,inflateRawSync(zip.subarray(start,start+packed))); offset=start+packed;
  }
  for(const name of ['.gitignore','.gitattributes','.github/workflows/deploy.yml','docs/DEPLOYMENT.md','README.md','LICENSE','NOTICE.md','index.html','src/decision.js','src/sep.pl','src/tap.pl','scripts/build.mjs','tests/prover.test.mjs','vendor/mleansep12_swi.pl','vendor/mleantap13_swi.pl','vendor/package/LICENSE.txt','vendor/package/dist/swipl/swipl-web.wasm','docs/DECISION-PROCEDURE.md']) assert.ok(archive.has(`ModProver/${name}`),name);
  for(const name of ['AGENTS.md','discussion.txt','preview.png']) assert.equal(archive.has(`ModProver/${name}`),false,name);
  for(const line of archive.get('ModProver/SHA256SUMS').toString().trim().split('\n')) {
    const [hash,name]=line.split('  '); assert.equal(createHash('sha256').update(archive.get(name)).digest('hex'),hash,name);
  }
  const server=createAppServer(fileURLToPath(new URL('../dist/',import.meta.url)),'/modal/');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const origin=`http://127.0.0.1:${server.address().port}`;
    const page=await fetch(origin+'/modal/'); assert.equal(page.status,200);
    assert.match(await page.text(),/\.\/src\/app\.js/);
    for(const name of ['src/prover-worker.js','src/decision.js','src/semantics.js','src/sep.pl','src/tap.pl','vendor/mleansep12_swi.pl','vendor/mleantap13_swi.pl','vendor/package/dist/swipl/swipl-web.js','vendor/package/dist/swipl/swipl-web.wasm','vendor/package/dist/swipl/swipl-web.data','source.zip','license.html']) assert.equal((await fetch(origin+`/modal/${name}`,{method:'HEAD'})).status,200,name);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
test('local server serves runtime assets and protects workspace files',async()=>{
  const server=createAppServer(fileURLToPath(new URL('../',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const origin=`http://127.0.0.1:${server.address().port}`;
    for(const path of ['/','/src/app.js','/src/sep.pl','/vendor/mleansep12_swi.pl','/vendor/package/dist/swipl/swipl-web.wasm','/LICENSE']) assert.equal((await fetch(origin+path,{method:'HEAD'})).status,200,path);
    assert.equal((await fetch(origin+'/vendor/package/dist/swipl/swipl-web.wasm',{method:'HEAD'})).headers.get('content-type'),'application/wasm');
    for(const path of ['/AGENTS.md','/discussion.txt','/.git/config','/%2e%2e%5cIntProver%5cREADME.md','/src/%2e%2e%5cAGENTS.md']) assert.equal((await fetch(origin+path)).status,404,path);
    assert.equal((await fetch(origin+'/',{method:'POST'})).status,405);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
