import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutCountermodel } from '../src/countermodel-layout.js';
const frame=(n,edges,root=0) => ({root,worlds:Array.from({length:n},()=>({atoms:[]})),edges});
test('one-way arrows point upward through chains and branching frames',()=>{
  for (const model of [frame(2,[[0,1]]),frame(4,[[0,1],[0,2],[1,3],[2,3],[0,3]]),frame(3,[[2,1],[1,0]],2)]) {
    const before=structuredClone(model), {positions}=layoutCountermodel(model);
    for (const [a,b] of model.edges) assert.ok(positions[b].y<positions[a].y);
    assert.deepEqual(model,before);
  }
});
test('reciprocal worlds align horizontally with or without self-loops',()=>{
  for(const edges of [[[0,1],[1,0]],[[0,0],[1,1],[0,1],[1,0]]]) {
    const {positions}=layoutCountermodel(frame(2,edges));
    assert.equal(positions[0].y,positions[1].y);
    assert.notEqual(positions[0].x,positions[1].x);
  }
  const {positions}=layoutCountermodel(frame(4,[[0,1],[1,0],[0,2],[1,2],[2,3],[3,2]]));
  assert.equal(positions[0].y,positions[1].y);
  assert.equal(positions[2].y,positions[3].y);
  assert.ok(positions[2].y<positions[0].y);
});
test('upward order takes priority when mutual alignment creates a conflict',()=>{
  // Aligning all three through the mutual pairs would make 0→2 horizontal.
  const {positions}=layoutCountermodel(frame(3,[[0,1],[1,0],[1,2],[2,1],[0,2]]));
  assert.ok(positions[2].y<positions[0].y);
  assert.equal(positions[0].y,positions[1].y);
  assert.notEqual(positions[1].y,positions[2].y);
});
test('directed cycles still produce a finite nonoverlapping drawing',()=>{
  const {width,height,positions}=layoutCountermodel(frame(3,[[0,1],[1,2],[2,0]]));
  assert.ok(positions.filter((p,i)=>positions[(i+1)%3].y<p.y).length>=2);
  assert.equal(new Set(positions.map(p=>`${p.x},${p.y}`)).size,3);
  for(const p of positions) { assert.ok(p.x>=43 && p.x<=width-43); assert.ok(p.y>=90 && p.y<=height-43); }
});
test('a large equivalence cluster has room for every world on one row',()=>{
  const edges=Array.from({length:24},(_,a)=>Array.from({length:24},(_,b)=>[a,b])).flat();
  const {width,height,positions}=layoutCountermodel(frame(24,edges));
  assert.equal(new Set(positions.map(p=>p.y)).size,1);
  for(let i=1;i<positions.length;i++) assert.ok(positions[i].x-positions[i-1].x>=160);
  for(const p of positions) assert.ok(p.x>=43 && p.x<=width-43 && p.y<height-43);
});
