// SPDX-License-Identifier: GPL-3.0-or-later
// Infix parser and preview added 2026-10-05. See NOTICE.md and LICENSE.
const operators = new Set(['and', 'or', 'imp']);
const prefixes = new Set(['neg', 'box', 'dia', 'diamond']);
const MAX_LENGTH = 8000;
const MAX_DEPTH = 100;

export class FormulaError extends Error {
  constructor(message, position = 0) {
    super(message);
    this.name = 'FormulaError';
    this.position = position;
  }
}

export function parseFormula(input) {
  if (input.length > MAX_LENGTH) throw new FormulaError('Please use a formula shorter than 8,000 characters.');
  const tokens = [];
  const pattern = /\s+|[()]|[A-Za-z]+[0-9]*|./gy;
  for (const match of input.matchAll(pattern)) {
    const value = match[0];
    if (/^\s+$/.test(value)) continue;
    if (!['(', ')', 'true', 'false', ...prefixes, ...operators].includes(value) && !/^[A-Za-z][0-9]*$/.test(value)) {
      throw new FormulaError(`Unrecognized input “${value}”. Use proposition letters, true, false, neg, box, dia (or diamond), and, or, and imp.`, match.index);
    }
    tokens.push({ value, position: match.index });
  }
  let cursor = 0;
  const fail = (message, token = tokens[cursor]) => {
    throw new FormulaError(message, token?.position ?? input.length);
  };
  function group(depth = 0) {
    if (depth > MAX_DEPTH) fail('Please use fewer than 100 nested parentheses or negations.');
    const items = [];
    const ops = [];
    function operand(operandDepth = depth) {
      if (operandDepth > MAX_DEPTH) fail('Please use fewer than 100 nested parentheses or negations.');
      const token = tokens[cursor];
      if (!token) fail('Expected a formula.');
      if (prefixes.has(token.value)) {
        cursor++;
        return { type: token.value === 'dia' ? 'diamond' : token.value, argument: operand(operandDepth + 1) };
      }
      if (token.value === '(') {
        cursor++;
        const child = group(operandDepth + 1);
        if (tokens[cursor]?.value !== ')') fail('Missing a closing parenthesis.');
        cursor++;
        return child;
      }
      if (token.value === ')' || operators.has(token.value)) fail(`Expected a formula before “${token.value}”.`);
      cursor++;
      return token.value === 'true' || token.value === 'false'
        ? { type: token.value }
        : { type: 'atom', name: token.value };
    }
    items.push(operand());
    while (cursor < tokens.length && tokens[cursor].value !== ')') {
      const token = tokens[cursor++];
      if (!operators.has(token.value)) fail(`Expected and, or, or imp before “${token.value}”.`, token);
      ops.push(token);
      items.push(operand());
    }
    const implications = ops.filter(op => op.value === 'imp');
    if (implications.length > 1) fail('Add parentheses: each group can contain only one imp.', implications[1]);
    const conjunction = ops.find(op => op.value === 'and');
    const disjunction = ops.find(op => op.value === 'or');
    if (conjunction && disjunction) fail('Add parentheses to separate and from or.', conjunction.position > disjunction.position ? conjunction : disjunction);
    function fold(start, end) {
      let node = items[start];
      for (let i = start; i < end; i++) node = { type: ops[i].value, left: node, right: items[i + 1] };
      return node;
    }
    const implicationIndex = ops.findIndex(op => op.value === 'imp');
    return implicationIndex < 0 ? fold(0, ops.length) : {
      type: 'imp', left: fold(0, implicationIndex), right: fold(implicationIndex + 1, ops.length)
    };
  }
  if (!tokens.length) fail('Enter a formula to begin.');
  const ast = group();
  if (cursor < tokens.length) fail('Unexpected closing parenthesis.');
  return ast;
}

// Serialize only parsed ASTs using quoted functors, independent of Prolog
// operator declarations. Users cannot supply executable Prolog terms.
const truth = "'=>'('$modprover_truth','$modprover_truth')";
export function toProlog(ast) {
  switch (ast.type) {
    case 'atom': return `'${ast.name}'`;
    case 'true': return truth;
    case 'false': return `'~'(${truth})`;
    case 'neg': return `'~'(${toProlog(ast.argument)})`;
    case 'box': return `'#'(${toProlog(ast.argument)})`;
    case 'diamond': return `'*'(${toProlog(ast.argument)})`;
    default: return `'${{imp: '=>', and: ',', or: ';'}[ast.type]}'(${toProlog(ast.left)},${toProlog(ast.right)})`;
  }
}

const symbols = { and: '∧', or: '∨', imp: '→', neg: '¬', box: '□', diamond: '◇', true: '⊤', false: '⊥' };
export function formatFormula(ast, nested = false) {
  if (ast.type === 'atom') return ast.name;
  if (ast.type === 'true' || ast.type === 'false') return symbols[ast.type];
  if (prefixes.has(ast.type)) return `${symbols[ast.type]}${formatFormula(ast.argument, true)}`;
  function part(child) {
    return child.type === ast.type && ast.type !== 'imp'
      ? formatFormula(child, false) : formatFormula(child, true);
  }
  const expression = `${part(ast.left)} ${symbols[ast.type]} ${part(ast.right)}`;
  return nested ? `(${expression})` : expression;
}

export function formulaMathML(ast) {
  const text = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  function render(node, nested = false, parent = null) {
    if (node.type === 'atom') {
      const [, letter, number] = node.name.match(/^([A-Za-z])([0-9]*)$/);
      return number ? `<msub><mi>${text(letter)}</mi><mn>${number}</mn></msub>` : `<mi>${text(letter)}</mi>`;
    }
    if (node.type === 'true' || node.type === 'false') return `<mo>${symbols[node.type]}</mo>`;
    if (prefixes.has(node.type)) return `<mrow><mo>${symbols[node.type]}</mo>${render(node.argument, true, node.type)}</mrow>`;
    const body = `${render(node.left, true, node.type)}<mo>${symbols[node.type]}</mo>${render(node.right, true, node.type)}`;
    const grouped = nested && !(parent === node.type && node.type !== 'imp');
    return `<mrow>${grouped ? '<mo>(</mo>' : ''}${body}${grouped ? '<mo>)</mo>' : ''}</mrow>`;
  }
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${text(formatFormula(ast))}">${render(ast)}</math>`;
}
