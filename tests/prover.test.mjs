import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import SWIPL from '../vendor/package/dist/index.js';
import { parseFormula,toProlog } from '../src/formula.js';
import { decide } from '../src/decision.js';
const diagnostics=[];
const runtime=await SWIPL({arguments:['-q'],print:()=>{},printErr:message=>diagnostics.push(message)});
for(const [source,target] of [['vendor/mleansep12_swi.pl','/mleansep.pl'],['vendor/mleantap13_swi.pl','/mleantap.pl'],['src/sep.pl','/sep.pl'],['src/tap.pl','/tap.pl']]) runtime.FS.writeFile(target,await readFile(new URL(`../${source}`,import.meta.url),'utf8'));
for(const path of ['/sep.pl','/tap.pl']) assert.equal(runtime.prolog.query(`load_files('${path}',[imports([])]).`).once().success,true);
function original(input,logic) {
  const module=logic==='S5'?'tap':'sep';
  const answer=runtime.prolog.query(`${module}:modal_proof(${logic.toLowerCase()},${toProlog(parseFormula(input))},Verdict).`).once();
  assert.equal(answer.success,true); return answer.Verdict;
}
test('actual MleanSeP proves characteristic axioms in browser-compatible WASM',()=>{
  for(const [formula,logic] of [['p or neg p','K'],['box (p imp q) imp (box p imp box q)','K'],['box p imp p','T'],['box p imp box box p','K4'],['box p imp (p and box box p)','S4'],['box p imp diamond p','D'],['box p imp box box p','D4'],['box true','K'],['neg diamond false','S4']]) assert.equal(original(formula,logic),'valid',`${logic}: ${formula}`);
});
test('actual MleanTAP proves S5 axioms',()=>{
  for(const formula of ['box p imp p','diamond p imp box diamond p','p imp box diamond p','box p imp box box p','box true']) assert.equal(original(formula,'S5'),'valid',formula);
});
test('failure, limits and logic switches cannot become negative verdicts',()=>{
  assert.equal(original('box p imp p','S4'),'valid');
  assert.equal(original('box p imp p','K'),'unknown');
  assert.equal(original('box p imp p','T'),'valid');
  assert.equal(original('false','S5'),'unknown');
  assert.equal(original('diamond p imp box diamond p','S4'),'unknown');
});
test('original engines and finite elimination agree on proved formulas',()=>{
  const formulas=['p imp p','p or neg p','box p imp p','box p imp box box p','diamond p imp box diamond p','box p imp diamond p','box (p imp q) imp (box p imp box q)','true','false','box false','diamond true'];
  for(const logic of ['K','T','K4','S4','S5','D','D4']) for(const formula of formulas) if(original(formula,logic)==='valid') assert.equal(decide(parseFormula(formula),logic).valid,true,`${logic}: ${formula}`);
});
test('both unchanged source files load without errors',()=>assert.equal(diagnostics.some(message=>/ERROR|Unknown procedure/.test(message)),false,diagnostics.join('\n')));

test('both original engines accept biimplication and agree with its modal semantics',()=>{
  for(const logic of ['K','T','K4','S4','S5','D','D4']) {
    for(const formula of ['p iff p','(p iff q) iff ((p imp q) and (q imp p))','box p iff neg dia neg p']) {
      assert.equal(original(formula,logic),'valid',`${logic}: ${formula}`);
      assert.equal(decide(parseFormula(formula),logic).valid,true,`${logic}: ${formula}`);
    }
    assert.equal(original('p iff q',logic),'unknown',logic);
    assert.equal(decide(parseFormula('p iff q'),logic).valid,false,logic);
  }
});
