// SPDX-License-Identifier: GPL-3.0-or-later
// Prefer upward one-way edges, then horizontal reciprocal pairs. Geometry
// never changes the model's worlds, valuations or accessibility relation.
export function layoutCountermodel(model) {
  const n = model.worlds.length;
  const relation = new Set(model.edges.map(([a,b]) => `${a},${b}`));
  const oneWay = model.edges.filter(([a,b]) => a !== b && !relation.has(`${b},${a}`));
  const reciprocal = model.edges.filter(([a,b]) => a < b && relation.has(`${b},${a}`));
  const remaining = new Set(Array.from({length:n}, (_,i) => i)), order = [];
  while (remaining.size) {
    // Acyclic one-way graphs always have a source. In a directed cycle,
    // pointing every edge upward is impossible: break as few constraints
    // as this deterministic source heuristic can, while retaining arrows.
    const candidates = [...remaining].map(id => ({id, incoming:oneWay.filter(([a,b]) => b===id && remaining.has(a)).length}));
    candidates.sort((a,b) => a.incoming-b.incoming || Number(b.id===model.root)-Number(a.id===model.root) || a.id-b.id);
    const id = candidates[0].id; remaining.delete(id); order.push(id);
  }
  const indexes = new Map(order.map((id,i) => [id,i]));
  const upward = oneWay.filter(([a,b]) => indexes.get(a) < indexes.get(b));
  let groups = Array.from({length:n}, (_,i) => i);
  function ranked(candidate) {
    const ids = [...new Set(candidate)], outgoing = new Map(ids.map(id => [id,new Set()]));
    const incoming = new Map(ids.map(id => [id,0])), rank = new Map(ids.map(id => [id,0]));
    for (const [a,b] of upward) {
      const source=candidate[a], target=candidate[b];
      if (source===target) return null;
      if (!outgoing.get(source).has(target)) { outgoing.get(source).add(target); incoming.set(target,incoming.get(target)+1); }
    }
    const queue = ids.filter(id => incoming.get(id)===0);
    for (let i=0;i<queue.length;i++) for (const target of outgoing.get(queue[i])) {
      rank.set(target,Math.max(rank.get(target),rank.get(queue[i])+1));
      incoming.set(target,incoming.get(target)-1);
      if (incoming.get(target)===0) queue.push(target);
    }
    return queue.length===ids.length ? rank : null;
  }
  for (const [a,b] of reciprocal) {
    if (groups[a]===groups[b]) continue;
    const source=groups[a], target=groups[b];
    const merged=groups.map(id => id===target ? source : id);
    // Align reciprocal worlds only if equality does not create a directed
    // cycle or put a one-way edge's endpoints on the same row.
    if (ranked(merged)) groups=merged;
  }
  const rank=ranked(groups), maximum=Math.max(...rank.values());
  const rows=Array.from({length:maximum+1}, () => []);
  for (let id=0;id<n;id++) rows[rank.get(groups[id])].push(id);
  const groupOrder=new Map([...new Set(groups)].map(id => [id,Math.min(...order.filter(w => groups[w]===id).map(w => indexes.get(w)))]));
  for (const row of rows) row.sort((a,b) => groupOrder.get(groups[a])-groupOrder.get(groups[b]) || a-b);
  const width=Math.max(520,Math.max(...rows.map(row => row.length))*160+80);
  const height=Math.max(340,maximum*180+220);
  const positions=Array(n);
  rows.forEach((row,level) => row.forEach((id,i) => {
    positions[id]={x:width/2+(i-(row.length-1)/2)*160,y:maximum ? 110+(maximum-level)*180 : height/2};
  }));
  return {width,height,positions};
}
