// SPDX-License-Identifier: GPL-3.0-or-later
// Independent classical modal semantics; no assumption of persistent atoms.
export const LOGICS = Object.freeze({
  K: { label: 'Unrestricted accessibility' },
  T: { reflexive: true, label: 'Reflexive' },
  K4: { transitive: true, label: 'Transitive' },
  S4: { reflexive: true, transitive: true, label: 'Reflexive and transitive' },
  S5: { reflexive: true, transitive: true, symmetric: true, label: 'Equivalence relation' },
  D: { serial: true, label: 'Serial: every world has a successor' },
  D4: { serial: true, transitive: true, label: 'Serial and transitive' },
});

export function evaluate(ast, model, world = model.root) {
  const successors = model.worlds.map(() => []);
  for (const [a, b] of model.edges) successors[a].push(b);
  const cache = new WeakMap();
  function truth(node, w) {
    let values = cache.get(node);
    if (!values) cache.set(node, values = new Map());
    if (values.has(w)) return values.get(w);
    let value;
    switch (node.type) {
      case 'atom': value = model.worlds[w].atoms.includes(node.name); break;
      case 'true': value = true; break;
      case 'false': value = false; break;
      case 'neg': value = !truth(node.argument, w); break;
      case 'and': value = truth(node.left, w) && truth(node.right, w); break;
      case 'or': value = truth(node.left, w) || truth(node.right, w); break;
      case 'imp': value = !truth(node.left, w) || truth(node.right, w); break;
      case 'box': value = successors[w].every(v => truth(node.argument, v)); break;
      case 'diamond': value = successors[w].some(v => truth(node.argument, v)); break;
      default: throw new Error('Unknown connective.');
    }
    values.set(w, value);
    return value;
  }
  return truth(ast, world);
}

export function verifyCountermodel(ast, logic, model) {
  const rules = LOGICS[logic];
  if (!rules || !Array.isArray(model?.worlds) || !model.worlds.length ||
      !Number.isInteger(model.root) || model.root < 0 || model.root >= model.worlds.length) return false;
  if (!model.worlds.every(w => Array.isArray(w.atoms) && w.atoms.every(a => /^[A-Za-z][0-9]*$/.test(a)))) return false;
  const relation = model.worlds.map(() => new Set());
  if (!Array.isArray(model.edges)) return false;
  for (const edge of model.edges) {
    if (!Array.isArray(edge) || edge.length !== 2 || !edge.every(w => Number.isInteger(w) && w >= 0 && w < model.worlds.length)) return false;
    relation[edge[0]].add(edge[1]);
  }
  for (let a = 0; a < relation.length; a++) {
    if (rules.reflexive && !relation[a].has(a)) return false;
    if (rules.serial && !relation[a].size) return false;
    for (const b of relation[a]) {
      if (rules.symmetric && !relation[b].has(a)) return false;
      if (rules.transitive) for (const c of relation[b]) if (!relation[a].has(c)) return false;
    }
  }
  return !evaluate(ast, model);
}
