// SPDX-License-Identifier: GPL-3.0-or-later
const NS = 'http://www.w3.org/2000/svg';
import { formatFormula } from './formula.js';
import { layoutCountermodel } from './countermodel-layout.js';
function svgElement(name, attrs = {}, text) {
  const el = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}
function paragraph(text) { const p = document.createElement('p'); p.className = 'countermodel-caption'; p.textContent = text; return p; }
export function renderModel(container, model, ast) {
  const heading = document.createElement('h2'); heading.textContent = 'Kripke countermodel';
  container.append(heading, paragraph(`${formatFormula(ast)} is false at w${model.root} in ${model.logic}. Each arrow is an accessibility relation; a loop means a world sees itself. Letters inside a world are true there; all other input letters are false.`));
  const n = model.worlds.length;
  if (n <= 24) {
    const {width,height,positions} = layoutCountermodel(model);
    const svg = svgElement('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img', 'aria-label': `Verified ${model.logic} countermodel with ${n} ${n === 1 ? 'world' : 'worlds'}. Full accessibility relation follows in the table.`, class: `modal-model${n <= 4 ? ' modal-model-small' : ''}` });
    const defs = svgElement('defs'), marker = svgElement('marker', { id: 'arrow', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto', markerUnits: 'userSpaceOnUse' });
    marker.append(svgElement('path', { d: 'M0 0 L8 4 L0 8 Z', fill: '#8a7a9e' })); defs.append(marker); svg.append(defs);
    const edges = new Set(model.edges.map(([a,b]) => `${a},${b}`));
    for (const [a,b] of model.edges) {
      const p = positions[a], q = positions[b]; let d;
      if (a === b) {
        // Place a loop on a free side rather than across an upward arrow.
        const sides=[{x:0,y:-1,angle:0},{x:1,y:0,angle:Math.PI/2},{x:0,y:1,angle:Math.PI},{x:-1,y:0,angle:-Math.PI/2}];
        const neighbors=positions.filter((_,i) => i!==a && (edges.has(`${a},${i}`) || edges.has(`${i},${a}`)));
        const cost=side => neighbors.reduce((sum,r) => sum+Math.max(0,((r.x-p.x)*side.x+(r.y-p.y)*side.y)/Math.hypot(r.x-p.x,r.y-p.y))**4,0);
        sides.sort((left,right) => cost(left)-cost(right));
        const angle=sides[0].angle;
        const point=(x,y) => `${p.x+x*Math.cos(angle)-y*Math.sin(angle)},${p.y+x*Math.sin(angle)+y*Math.cos(angle)}`;
        d = `M${point(-20,-28)} C${point(-68,-90)} ${point(68,-90)} ${point(20,-28)}`;
      }
      else {
        const dx = q.x - p.x, dy = q.y - p.y, length = Math.hypot(dx,dy), ux = dx / length, uy = dy / length;
        // Bend an edge around any intervening world (e.g. the transitive
        // root-to-top edge of a three-world chain), keeping its direction.
        const obstructed = positions.some((r,i) => {
          if (i===a || i===b) return false;
          const distance=(r.x-p.x)*ux+(r.y-p.y)*uy;
          return distance>44 && distance<length-44 && Math.abs((r.x-p.x)*uy-(r.y-p.y)*ux)<55;
        });
        const mutual = edges.has(`${b},${a}`);
        const curve = obstructed ? 140 : mutual ? 28 : 0;
        // Keep the control point vertically between the endpoints of a
        // one-way edge, so its arrowhead continues to point upward.
        d = `M${p.x + ux * 44},${p.y + uy * 44} Q${(p.x+q.x)/2 - uy*curve},${(p.y+q.y)/2 + (mutual ? ux*curve : 0)} ${q.x - ux * 46},${q.y - uy * 46}`;
      }
      svg.append(svgElement('path', { d, fill: 'none', stroke: '#9a8aa9', 'stroke-width': 1.5, 'marker-end': 'url(#arrow)' }));
    }
    model.worlds.forEach((world, i) => {
      const {x,y} = positions[i]; const group = svgElement('g');
      group.append(svgElement('title', {}, `w${i}${i===model.root ? ' (root)' : ''}: ${world.atoms.join(', ') || 'no true atoms'}`));
      group.append(svgElement('circle', { cx:x, cy:y, r:43, fill: i===model.root ? '#eee7f5' : '#fcfbfd', stroke:i===model.root ? '#72508e' : '#beb1cc', 'stroke-width':i===model.root ? 2.5 : 1.5 }));
      group.append(svgElement('text', { x, y:y-6, 'text-anchor':'middle', class:'world-name' }, `w${i}${i===model.root ? ' · root' : ''}`));
      const label = world.atoms.join(', ') || '∅';
      group.append(svgElement('text', { x, y:y+15, 'text-anchor':'middle', class:'world-atoms' }, label.length > 12 ? `${label.slice(0,10)}…` : label)); svg.append(group);
    });
    const scroll = document.createElement('div'); scroll.className = 'countermodel-scroll'; scroll.append(svg); container.append(scroll);
  } else container.append(paragraph('This model is too large for a readable drawing. The table lists every world and accessibility arrow.'));
  const detail = document.createElement('details'); detail.open = n > 24;
  const summary = document.createElement('summary'); summary.textContent = `Worlds and accessibility (${n} ${n === 1 ? 'world' : 'worlds'}, ${model.edges.length} ${model.edges.length === 1 ? 'arrow' : 'arrows'})`; detail.append(summary);
  const table = document.createElement('table');
  const head = table.createTHead().insertRow();
  for (const label of ['World', 'True proposition letters', 'Accessible worlds']) { const th = document.createElement('th'); th.textContent = label; head.append(th); }
  const body = table.createTBody();
  model.worlds.forEach((w,i) => { const row = body.insertRow(); for (const value of [`w${i}${i===model.root ? ' (root)' : ''}`, w.atoms.join(', ') || '∅', model.edges.filter(([a]) => a===i).map(([,b]) => `w${b}`).join(', ') || 'None']) row.insertCell().textContent = value; });
  const scroll = document.createElement('div'); scroll.className='table-scroll'; scroll.append(table); detail.append(scroll); container.append(detail);
}

export function renderProof(container, proof, ast) {
  const heading = document.createElement('h2'); heading.textContent = 'Proof tableau'; container.append(heading);
  container.append(paragraph('Assume the formula is false. The tableau considers every truth assignment to its atoms and distinct boxed subformulas. A branch closes when it violates reflexivity or cannot supply a required accessible world. Diamonds are expanded as ¬□¬.'));
  const locallyClosed = new Map(proof.localClosures.map(row => [row.id,row]));
  const removed = new Map(proof.rounds.flatMap((round,i) => round.map(row => [row.id, {...row, round:i+1}])));
  const tree = document.createElement('details'); tree.open = true;
  const title = document.createElement('summary'); title.textContent = `¬(${formatFormula(ast)}) · all ${proof.roots.length} possible root branches closed`; tree.append(title);
  if (!proof.roots.length) tree.append(paragraph('Closed by Boolean reasoning: no local truth assignment makes the formula false.'));
  for (const id of proof.roots.slice(0, 256)) {
    const branch = document.createElement('details'); branch.className = 'proof-branch';
    const row = locallyClosed.get(id) || removed.get(id);
    const reason = locallyClosed.has(id) ? `Reflexivity: ${proof.boxes[row.box]} is true but its content is false.` : row.box === null ? `Round ${row.round}: seriality requires a successor, but none remains.` : `Round ${row.round}: ${proof.boxes[row.box]} is false, but no compatible successor makes its content false.`;
    const summary = document.createElement('summary'); summary.textContent = `× Branch ${id} · ${locallyClosed.has(id) ? 'Reflexivity' : `No witness (round ${row.round})`}`; branch.append(summary, paragraph(reason));
    branch.append(paragraph(proof.variables.map((label,i) => `${id & 2 ** i ? 'T' : 'F'} ${label}`).join(' · '))); tree.append(branch);
  }
  if (proof.roots.length > 256) tree.append(paragraph(`Showing 256 of ${proof.roots.length} closed root branches. All branches were checked; the full certificate is available below.`));
  container.append(tree);
  const certificate = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = 'Full proof certificate';
  const pre = document.createElement('pre'); pre.textContent = JSON.stringify(proof, null, 2); certificate.append(summary,pre); container.append(certificate);
}
