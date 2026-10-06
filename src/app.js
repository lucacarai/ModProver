// SPDX-License-Identifier: GPL-3.0-or-later
import { parseFormula, formulaMathML } from './formula.js';
import { LOGICS } from './semantics.js';
import { renderModel } from './diagram.js';
const $ = selector => document.querySelector(selector);
const input = $('#formula-input'), logic = $('#logic'), preview = $('#preview'), error = $('#input-error');
const run = $('#run'), cancel = $('#cancel'), result = $('#result'), status = $('#engine-status'), details = $('#details');
let ast, worker, ready = false, checking = false, requestId = 0, timer;
function controls() { run.disabled = !ast || !ready || checking; cancel.hidden = !checking; run.querySelector('span').textContent = checking ? 'Running' : 'Run'; }
function showResult(state, message) {
  result.hidden = false; result.dataset.state = state;
  const mark = document.createElement('span'); mark.className = state === 'checking' ? 'spinner' : 'result-mark'; mark.setAttribute('aria-hidden','true'); mark.textContent = { valid:'✓', invalid:'○', error:'!' }[state] || '';
  const label = document.createElement('span'); label.textContent = message; result.replaceChildren(mark,label);
}
function startWorker() {
  worker?.terminate(); ready = false; status.textContent = 'Getting ready…';
  worker = new Worker(new URL('./prover-worker.js', import.meta.url)); const current = worker;
  worker.onmessage = ({data}) => {
    if (current !== worker) return;
    if (data.type === 'ready') { ready = true; status.textContent = ''; controls(); return; }
    if (data.id !== requestId && data.id !== undefined) return;
    clearTimeout(timer); checking = false;
    if (data.type === 'result') {
      showResult(data.valid ? 'valid' : 'invalid', `${data.valid ? 'Valid' : 'Not valid'} in ${logic.value}`);
      status.textContent = data.valid ? '' : 'Countermodel independently verified';
      details.replaceChildren(); details.hidden = true;
      // Proof generation, verification and rendering remain available in
      // the source; the GUI presents only the verdict for valid formulas.
      if (!data.valid && data.model) {
        details.hidden = false;
        renderModel(details, data.model, ast);
      }
    } else { showResult('error', `Check incomplete. ${data.message || 'Please reload and try again.'}`); status.textContent=''; }
    controls();
  };
  worker.onerror = () => { if (worker !== current) return; clearTimeout(timer); checking=false; ready=false; showResult('error','The modal engines could not start. Reload the page to try again.'); status.textContent=''; controls(); };
  controls();
}
function stopCheck() { clearTimeout(timer); checking=false; requestId++; startWorker(); }
function clearResult() { result.hidden=true; details.hidden=true; details.replaceChildren(); if (ready) status.textContent=''; }
function updateFormula() {
  if (checking) stopCheck(); clearResult(); ast=null; error.hidden=true; input.removeAttribute('aria-invalid');
  if (!input.value.trim()) preview.innerHTML='<p class="preview-placeholder">Your formula will appear here.</p>';
  else try { ast=parseFormula(input.value); preview.innerHTML=formulaMathML(ast); }
  catch (e) { input.setAttribute('aria-invalid','true'); error.textContent=e.message; error.hidden=false; preview.innerHTML='<p class="preview-placeholder">Adjust your formula to see its preview.</p>'; }
  controls();
}
input.addEventListener('input',updateFormula);
logic.addEventListener('change', () => { if (checking) stopCheck(); clearResult(); $('#frame-description').textContent=LOGICS[logic.value].label; controls(); });
$('#frame-description').textContent=LOGICS[logic.value].label;
$('#formula-form').addEventListener('submit', event => {
  event.preventDefault(); if (!ast || !ready || checking) return;
  clearResult(); checking=true; const id=++requestId;
  showResult('checking', `Checking in ${logic.value}…`); controls(); worker.postMessage({id,input:input.value,logic:logic.value});
  timer=setTimeout(() => { if (id!==requestId || !checking) return; stopCheck(); showResult('error','Check incomplete: the 30-second limit was reached. Try a smaller formula.'); },30_000);
});
cancel.addEventListener('click', () => { stopCheck(); clearResult(); });
startWorker();
