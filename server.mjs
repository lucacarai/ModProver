// SPDX-License-Identifier: GPL-3.0-or-later
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
export function createAppServer(root, prefix = '/') {
  const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.wasm':'application/wasm', '.pl':'text/plain; charset=utf-8', '.md':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.zip':'application/zip', '.json':'application/json' };
  return createServer(async (req,res) => {
    try {
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if (prefix!=='/' && (pathname==='/' || pathname===prefix.slice(0,-1))) { res.writeHead(302,{Location:prefix}); res.end(); return; }
      if (!pathname.startsWith(prefix)) throw new Error('Not found');
      const name=pathname.slice(prefix.length) || 'index.html';
      const path=resolve(root,name==='source.zip' && prefix==='/' ? 'dist/source.zip' : name), rel=relative(root,path);
      const permitted=['index.html','license.html','LICENSE','NOTICE.md','source.zip','dist/source.zip'].includes(rel) || /^(src|vendor|licenses)[\\/]/.test(rel);
      if (isAbsolute(rel) || rel.startsWith('..') || !permitted || !(await stat(path)).isFile()) throw new Error('Not found');
      res.writeHead(200,{'Content-Type':rel==='LICENSE'?'text/plain; charset=utf-8':mime[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
      res.end(req.method==='HEAD'?undefined:await readFile(path));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||4175);
  createAppServer(fileURLToPath(new URL('.',import.meta.url))).listen(port,'127.0.0.1',()=>console.log(`ModProver is ready at http://127.0.0.1:${port}`));
}
