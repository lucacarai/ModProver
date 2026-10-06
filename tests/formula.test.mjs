import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFormula, formatFormula, formulaMathML, toProlog } from '../src/formula.js';
test('modal prefixes bind tightly and render with grouping and subscripts', () => {
  assert.equal(formatFormula(parseFormula('box p imp diamond q')), '□p → ◇q');
  assert.equal(formatFormula(parseFormula('neg box (p imp q)')), '¬□(p → q)');
  assert.match(formulaMathML(parseFormula('box Q12')), /<mo>□<\/mo><msub><mi>Q<\/mi><mn>12<\/mn>/);
  assert.equal(toProlog(parseFormula('box p imp diamond q')), "'=>'('#'('p'),'*'('q'))");
  assert.deepEqual(parseFormula('dia p imp box dia p'), parseFormula('diamond p imp box diamond p'));
  assert.equal(formatFormula(parseFormula('dia (p and q)')), '◇(p ∧ q)');
  assert.equal(toProlog(parseFormula('dia p')), "'*'('p')");
});
test('reject ambiguous, oversized and executable input', () => {
  for (const input of ['box', 'dia', 'diamond', 'p q', 'p imp q imp r', 'p and q or r', 'p).halt.', "p'", 'P(x)', '[]', '□p', 'box '.repeat(102)+'p', 'p'.repeat(8001)]) assert.throws(() => parseFormula(input), undefined, input);
});
test('Boolean grammar and repeated prefixes remain usable', () => {
  for (const input of ['true', 'false', 'neg neg p', 'box diamond box p', 'p and q imp r', 'p imp q or r', '(box p and box q) imp box (p and q)']) assert.ok(parseFormula(input));
});

test('biimplication renders, serializes and binds after implication', () => {
  assert.equal(formatFormula(parseFormula('p iff q')), 'p ↔ q');
  assert.match(formulaMathML(parseFormula('p iff Q12')), /<mo>↔<\/mo><msub><mi>Q<\/mi><mn>12<\/mn>/);
  assert.equal(toProlog(parseFormula('box p iff neg dia neg p')), "'<=>'('#'('p'),'~'('*'('~'('p'))))");
  assert.deepEqual(parseFormula('p imp q iff r imp p'), parseFormula('(p imp q) iff (r imp p)'));
  assert.deepEqual(parseFormula('box p iff q and r'), parseFormula('(box p) iff (q and r)'));
  assert.equal(formatFormula(parseFormula('p iff (q iff r)')), 'p ↔ (q ↔ r)');
  assert.equal(formatFormula(parseFormula('(p iff q) iff r')), '(p ↔ q) ↔ r');
  assert.match(formulaMathML(parseFormula('neg (p iff q)')), /<mo>¬<\/mo><mrow><mo>\(<\/mo>.*<mo>↔<\/mo>.*<mo>\)<\/mo>/);
  for (const input of ['iff', 'p iff', 'p iff q iff r', 'p iff q imp r imp s']) assert.throws(() => parseFormula(input), undefined, input);
});
