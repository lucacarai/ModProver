import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFormula } from '../src/formula.js';
import { decide, SearchLimit, verifyProof } from '../src/decision.js';
import { LOGICS, evaluate, verifyCountermodel } from '../src/semantics.js';
export const cases = [
  ['p or neg p', ['K','T','K4','S4','S5','D','D4']],
  ['box (p imp q) imp (box p imp box q)', ['K','T','K4','S4','S5','D','D4']],
  ['box p imp p', ['T','S4','S5']],
  ['box p imp box box p', ['K4','S4','S5','D4']],
  ['diamond p imp box diamond p', ['S5']],
  ['p imp box diamond p', ['S5']],
  ['box p imp diamond p', ['T','S4','S5','D','D4']],
  ['diamond true', ['T','S4','S5','D','D4']],
  ['box true', ['K','T','K4','S4','S5','D','D4']],
  ['neg diamond false', ['K','T','K4','S4','S5','D','D4']],
  ['false', []], ['p', []], ['box false', []],
  ['diamond box p imp box diamond p', ['S5']],
  ['box p imp box (p and box p)', ['K4','S4','S5','D4']],
  ['box p imp box (p and diamond p)', ['T','S4','S5','D4']],
  ['neg box p imp diamond neg p', ['K','T','K4','S4','S5','D','D4']],
  ['p iff p', ['K','T','K4','S4','S5','D','D4']],
  ['p iff q', []],
  ['box p iff neg dia neg p', ['K','T','K4','S4','S5','D','D4']],
  ['box (p iff q) imp (box p iff box q)', ['K','T','K4','S4','S5','D','D4']],
  ['p iff box p', []],
];
test('separating axioms, modal dualities and constants in every logic', () => {
  for (const [input,validLogics] of cases) for (const logic of Object.keys(LOGICS)) {
    const ast=parseFormula(input), result=decide(ast,logic);
    assert.equal(result.valid,validLogics.includes(logic),`${logic}: ${input}`);
    if (result.valid) assert.equal(verifyProof(ast,logic,result.proof),true, `${logic}: ${input}`);
    else assert.equal(verifyCountermodel(ast,logic,result.model),true,`${logic}: ${input}`);
  }
});

test('biimplication agrees with both implications for every truth assignment', () => {
  const ast=parseFormula('p iff q');
  const expanded=parseFormula('(p imp q) and (q imp p)');
  for (const atoms of [[], ['p'], ['q'], ['p','q']]) {
    const model={root:0,worlds:[{atoms}],edges:[]};
    assert.equal(evaluate(ast,model),atoms.length===0 || atoms.length===2);
    assert.equal(evaluate(ast,model),evaluate(expanded,model));
  }
});
test('countermodels include cycles and allow atoms to stop holding along an arrow', () => {
  const cyclic=decide(parseFormula('p'), 'S5').model;
  assert.ok(cyclic.edges.some(([a,b])=>a===b));
  const ast=parseFormula('p imp box p'), result=decide(ast,'S4');
  assert.equal(result.valid,false);
  assert.ok(result.model.worlds[result.model.root].atoms.includes('p'));
  assert.ok(result.model.edges.some(([a,b])=>a===result.model.root && !result.model.worlds[b].atoms.includes('p')));
});
test('independent verifier rejects wrong frames, wrong roots and true formulas', () => {
  const ast=parseFormula('p');
  assert.equal(verifyCountermodel(ast,'S4',{root:0,worlds:[{atoms:[]}],edges:[]}),false);
  assert.equal(verifyCountermodel(ast,'K',{root:0,worlds:[{atoms:['p']}],edges:[]}),false);
  assert.equal(verifyCountermodel(ast,'K',{root:3,worlds:[{atoms:[]}],edges:[]}),false);
  assert.equal(verifyCountermodel(ast,'D',{root:0,worlds:[{atoms:[]}],edges:[]}),false);
  assert.equal(verifyCountermodel(ast,'S5',{root:0,worlds:[{atoms:[]},{atoms:[]}],edges:[[0,0],[1,1],[0,1]]}),false);
});
test('a corrupted validity certificate fails verification', () => {
  const ast=parseFormula('box p imp box box p'), {proof}=decide(ast,'S4');
  assert.ok(proof.rounds.length);
  const corrupted=structuredClone(proof); corrupted.rounds=[];
  assert.equal(verifyProof(ast,'S4',corrupted),false);
  assert.equal(verifyProof(ast,'K',proof),false);
});
test('limits report an incomplete search rather than invalidity', () => {
  assert.throws(()=>decide(parseFormula('p and q'),'K',{maxVariables:1}),SearchLimit);
  assert.throws(()=>decide(parseFormula('box p'),'K',{maxPairs:1}),SearchLimit);
});
test('compare type elimination with all two-world frames for a deterministic formula corpus', () => {
  let seed=57;
  const next=n=>{ seed=(seed*1664525+1013904223)>>>0; return seed%n; };
  function generate(depth) {
    if (!depth) return {type: ['atom','true','false'][next(3)],name:'p'};
    const type=['neg','box','diamond','and','or','imp','iff'][next(7)];
    return ['neg','box','diamond'].includes(type)?{type,argument:generate(depth-1)}:{type,left:generate(depth-1),right:generate(depth-1)};
  }
  for (let i=0;i<80;i++) {
    const ast=generate(3);
    for (const logic of Object.keys(LOGICS)) {
      const result=decide(ast,logic);
      if (result.valid) assert.ok(verifyProof(ast,logic,result.proof));
      else assert.ok(verifyCountermodel(ast,logic,result.model));
      for (let relation=0;relation<16;relation++) for (let valuation=0;valuation<4;valuation++) {
        const model={root:0,worlds:[0,1].map(w=>({atoms:valuation & 2**w?['p']:[]})),edges:[]};
        for(let a=0;a<2;a++) for(let b=0;b<2;b++) if(relation & 2**(a*2+b)) model.edges.push([a,b]);
        if (verifyCountermodel(ast,logic,model)) assert.equal(result.valid,false,`${logic}: ${JSON.stringify(ast)}`);
      }
    }
  }
});
