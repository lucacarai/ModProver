// SPDX-License-Identifier: GPL-3.0-or-later
const runtimeBase = new URL('../vendor/package/dist/swipl/', self.location.href).href;
importScripts(`${runtimeBase}swipl-web.js`);
let runtime;
const ready = (async () => {
  runtime = await SWIPL({ arguments: ['-q'], locateFile: path => new URL(path, runtimeBase).href, print: () => {}, printErr: message => console.warn(message) });
  for (const [source, target] of [['../vendor/mleansep12_swi.pl', '/mleansep.pl'], ['../vendor/mleantap13_swi.pl', '/mleantap.pl'], ['./sep.pl', '/sep.pl'], ['./tap.pl', '/tap.pl']]) {
    const response = await fetch(new URL(source, self.location.href));
    if (!response.ok) throw new Error('Could not load the modal engines.');
    runtime.FS.writeFile(target, await response.text());
  }
  for (const path of ['/sep.pl', '/tap.pl']) {
    if (!runtime.prolog.query(`load_files('${path}',[imports([])]).`).once().success) throw new Error('Could not initialize the modal engines.');
  }
  postMessage({ type: 'ready' });
})();
ready.catch(error => postMessage({ type: 'error', message: error.message }));

onmessage = async ({ data }) => {
  try {
    await ready;
    const { parseFormula, toProlog } = await import('./formula.js');
    const { LOGICS } = await import('./semantics.js');
    const { decide, SearchLimit, verifyProof } = await import('./decision.js');
    if (!Object.hasOwn(LOGICS, data.logic)) throw new Error('Unsupported logic.');
    const ast = parseFormula(data.input);
    const engine = data.logic === 'S5' ? 'MleanTAP 1.3' : 'MleanSeP 1.2';
    const module = data.logic === 'S5' ? 'tap' : 'sep';
    const answer = runtime.prolog.query(`${module}:modal_proof(${data.logic.toLowerCase()},${toProlog(ast)},Verdict).`).once();
    const upstreamValid = answer.success && answer.Verdict === 'valid';
    try {
      const decision = decide(ast, data.logic);
      if (upstreamValid && !decision.valid) throw new Error('The two engines disagree; no verdict will be displayed.');
      if (decision.valid && !verifyProof(ast, data.logic, decision.proof)) throw new Error('Proof verification failed.');
      postMessage({ type: 'result', id: data.id, ...decision, engine: upstreamValid ? engine : 'Finite type elimination', upstreamValid });
    } catch (error) {
      if (!(error instanceof SearchLimit)) throw error;
      if (upstreamValid) postMessage({ type: 'result', id: data.id, valid: true, engine, upstreamValid, notice: `Proved by ${engine}. Proof visualization is unavailable: ${error.message}` });
      else throw error;
    }
  } catch (error) { postMessage({ type: 'error', id: data.id, message: error.message }); }
};
