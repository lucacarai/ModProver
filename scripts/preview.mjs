// SPDX-License-Identifier: GPL-3.0-or-later
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../server.mjs';
const port=Number(process.env.PORT||4176);
const prefix=`/${(process.env.PREVIEW_PATH||'modprover').replace(/^\/+|\/+$/g,'')}/`;
createAppServer(fileURLToPath(new URL('../dist/',import.meta.url)),prefix).listen(port,'127.0.0.1',()=>console.log(`ModProver static build: http://127.0.0.1:${port}${prefix}`));
