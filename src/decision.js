// SPDX-License-Identifier: GPL-3.0-or-later
// Finite type elimination for K, T, K4, S4, S5, D and D4.
import { formatFormula } from './formula.js';
import { LOGICS, verifyCountermodel } from './semantics.js';

export class SearchLimit extends Error {
  constructor(message = 'The finite search exceeded its limits. Try a smaller formula.') { super(message); this.name = 'SearchLimit'; }
}

// Diamonds are duals of boxes, so the truth of each atom and each distinct
// boxed subformula completely determines a local Boolean type.
function normalize(node) {
  if (node.type === 'diamond') return { type: 'neg', argument: { type: 'box', argument: { type: 'neg', argument: normalize(node.argument) } } };
  if (node.argument) return { type: node.type, argument: normalize(node.argument) };
  if (node.left) return { type: node.type, left: normalize(node.left), right: normalize(node.right) };
  return node;
}

function prepare(ast, logic, maxVariables) {
  const rules = LOGICS[logic];
  if (!rules) throw new Error('Choose a supported logic.');
  const formula = normalize(ast);
  const atoms = new Map(), boxes = new Map();
  const key = node => JSON.stringify(node);
  function collect(node) {
    if (node.type === 'atom') atoms.set(node.name, node);
    if (node.type === 'box') boxes.set(key(node), node);
    if (node.argument) collect(node.argument);
    if (node.left) { collect(node.left); collect(node.right); }
  }
  collect(formula);
  const variables = [...atoms.values(), ...boxes.values()];
  if (variables.length > maxVariables) throw new SearchLimit(`This formula has ${variables.length} distinct atoms and boxed subformulas; the finite search limit is ${maxVariables}.`);
  const indexes = new Map(variables.map((node, i) => [key(node), i]));
  function truth(node, mask) {
    switch (node.type) {
      case 'atom': case 'box': return !!(mask & (2 ** indexes.get(key(node))));
      case 'true': return true;
      case 'false': return false;
      case 'neg': return !truth(node.argument, mask);
      case 'and': return truth(node.left, mask) && truth(node.right, mask);
      case 'or': return truth(node.left, mask) || truth(node.right, mask);
      case 'imp': return !truth(node.left, mask) || truth(node.right, mask);
      default: throw new Error('Unknown connective.');
    }
  }
  const boxed = [...boxes.values()];
  const types = Array.from({ length: 2 ** variables.length }, (_, id) => {
    const modal = boxed.reduce((mask, node, i) => mask | (truth(node, id) ? 2 ** i : 0), 0);
    const contents = boxed.reduce((mask, node, i) => mask | (truth(node.argument, id) ? 2 ** i : 0), 0);
    const local = rules.reflexive ? boxed.findIndex((_, i) => (modal & 2 ** i) && !(contents & 2 ** i)) : -1;
    return { id, modal, contents, local, root: !truth(formula, id) };
  });
  // This maximal relation preserves every true box. In transitive logics
  // it also propagates true boxes themselves. S5 types in one equivalence
  // class have identical box profiles. Reflexivity is enforced locally.
  function compatible(a, b) {
    return !(a.modal & ~b.contents) &&
      (!rules.transitive || !(a.modal & ~b.modal)) &&
      (!rules.symmetric || a.modal === b.modal);
  }
  return { rules, variables, atoms, boxed, types, compatible };
}

export function decide(ast, logic, { maxVariables = 12, maxPairs = 5_000_000, maxWorlds = 128 } = {}) {
  const p = prepare(ast, logic, maxVariables);
  const { types, boxed, rules, compatible } = p;
  const proof = {
    method: 'Finite type-elimination tableau', logic,
    variables: p.variables.map(node => formatFormula(node)),
    boxes: boxed.map(node => formatFormula(node)),
    total: types.length,
    localClosures: types.filter(t => t.local >= 0).map(t => ({ id: t.id, box: t.local })),
    roots: types.filter(t => t.root).map(t => t.id), rounds: [],
  };
  let active = types.filter(t => t.local < 0);
  // Pure Boolean or reflexivity closure already proves the formula.
  if (!active.some(t => t.root)) return { valid: true, proof };
  if (active.length ** 2 > maxPairs) throw new SearchLimit();
  const successors = new Map();
  for (const a of active) successors.set(a.id, active.filter(b => compatible(a, b)));
  let alive = new Set(active.map(t => t.id));
  while (true) {
    const removed = [];
    for (const a of active) {
      let witnessed = 0, serial = false;
      for (const b of successors.get(a.id)) {
        if (!alive.has(b.id)) continue;
        serial = true;
        witnessed |= ~b.contents;
      }
      const missing = (~a.modal & ~witnessed) & (2 ** boxed.length - 1);
      if (missing || (rules.serial && !serial)) {
        removed.push({ id: a.id, box: missing ? Math.log2(missing & -missing) : null });
      }
    }
    if (!removed.length) break;
    proof.rounds.push(removed);
    for (const { id } of removed) alive.delete(id);
    active = active.filter(t => alive.has(t.id));
    if (!active.some(t => t.root)) return { valid: true, proof };
  }
  const root = active.find(t => t.root);
  const selected = new Map([[root.id, root]]), links = new Map();
  const pending = [root];
  for (let i = 0; i < pending.length; i++) {
    const a = pending[i];
    const candidates = successors.get(a.id).filter(b => alive.has(b.id));
    // Prefer already selected types, then few outstanding diamond duties.
    candidates.sort((b, c) => Number(selected.has(c.id)) - Number(selected.has(b.id)) || c.modal - b.modal || b.id - c.id);
    const targets = new Set();
    if (rules.reflexive) targets.add(a.id);
    function add(b) {
      if (!b) throw new Error('Missing modal witness.');
      targets.add(b.id);
      if (!selected.has(b.id)) {
        if (selected.size >= maxWorlds) throw new SearchLimit('The countermodel exceeded the world limit. Try a smaller formula.');
        selected.set(b.id, b); pending.push(b);
      }
    }
    for (let j = 0; j < boxed.length; j++) {
      if (!(a.modal & 2 ** j) && ![...targets].some(id => !(selected.get(id).contents & 2 ** j))) {
        add(candidates.find(b => !(b.contents & 2 ** j)));
      }
    }
    if (rules.serial && !targets.size) add(candidates[0]);
    links.set(a.id, targets);
  }
  // Complete the chosen witnesses under the requested frame conditions.
  // Compatibility is itself transitive/symmetric in these systems, so the
  // closure cannot introduce an edge violating a true box.
  if (rules.symmetric) for (const [a, targets] of links) for (const b of targets) links.get(b).add(a);
  if (rules.transitive) for (const targets of links.values()) {
    const queue = [...targets];
    for (let i = 0; i < queue.length; i++) for (const c of links.get(queue[i])) {
      if (!targets.has(c)) { targets.add(c); queue.push(c); }
    }
  }
  const ids = [...selected.keys()], remap = new Map(ids.map((id, i) => [id, i]));
  const model = {
    logic, root: 0,
    worlds: ids.map(id => ({ atoms: [...p.atoms.keys()].filter((_, i) => id & 2 ** i) })),
    edges: ids.flatMap(a => [...links.get(a)].map(b => [remap.get(a), remap.get(b)])),
  };
  if (!verifyCountermodel(ast, logic, model)) throw new Error('Independent countermodel verification failed.');
  return { valid: false, model, proof };
}

// Check a validity certificate independently of the search's successor
// cache and witness construction. Every round may use only earlier rounds.
export function verifyProof(ast, logic, proof) {
  try {
    const p = prepare(ast, logic, 12);
    if (proof.logic !== logic || proof.total !== p.types.length ||
        JSON.stringify(proof.variables) !== JSON.stringify(p.variables.map(node => formatFormula(node)))) return false;
    const expectedLocal = p.types.filter(t => t.local >= 0).map(t => ({ id: t.id, box: t.local }));
    if (JSON.stringify(expectedLocal) !== JSON.stringify(proof.localClosures) ||
        JSON.stringify(p.types.filter(t => t.root).map(t => t.id)) !== JSON.stringify(proof.roots)) return false;
    const alive = new Set(p.types.filter(t => t.local < 0).map(t => t.id));
    for (const round of proof.rounds) {
      const ids = new Set();
      for (const { id, box } of round) {
        if (!alive.has(id) || ids.has(id)) return false;
        ids.add(id);
        const a = p.types[id];
        if (box === null) {
          if (!p.rules.serial || [...alive].some(j => p.compatible(a, p.types[j]))) return false;
        } else {
          if (!Number.isInteger(box) || box < 0 || box >= p.boxed.length || a.modal & 2 ** box) return false;
          if ([...alive].some(j => p.compatible(a, p.types[j]) && !(p.types[j].contents & 2 ** box))) return false;
        }
      }
      for (const id of ids) alive.delete(id);
    }
    return ![...alive].some(id => p.types[id].root);
  } catch { return false; }
}
