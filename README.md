# ModProver

A local browser prover for classical propositional modal logics **K, T, K4,
S4, S5, D and D4**, with mathematical previews, validity verdicts and
verified graphical Kripke countermodels.

## Run

With Node.js 22 or later available, run:

```text
node server.mjs
```

Open http://127.0.0.1:4175. No npm installation or system Prolog installation is
needed. The bundled SWI-Prolog WebAssembly runtime runs both original engines
inside a browser worker. All assets are local and formulas stay in your browser.
Set the `PORT` environment variable to use another port.

## Formula language

- Proposition letters: `p`, `q`, `P`, `p1`, `Q12` (case-sensitive).
- Constants: `true`, `false`.
- Prefix operators: `neg`, `box`, `dia`, rendered as ¬, □ and ◇.
  `diamond` is also accepted as an alias for `dia`.
- Infix operators: `and`, `or`, `imp`, rendered as ∧, ∨ and →.
- Prefixes bind first. `box p imp p` means `(box p) imp p`.
  Write `box (p imp q)` to put the implication inside the box.
- Repeated `and` or repeated `or` is allowed. Parenthesize mixed conjunctions
  and disjunctions, and repeated implications. `and` and `or` bind before `imp`.
- Unicode symbols are displayed in the preview; enter the words above.

Try `box p imp p` in K and then in S4; `box p imp box box p` in T and K4;
or `dia p imp box dia p` in S4 and S5.

| Logic | Accessibility condition |
| --- | --- |
| K | Unrestricted |
| T | Reflexive |
| K4 | Transitive |
| S4 | Reflexive and transitive |
| S5 | Equivalence relation |
| D | Serial |
| D4 | Serial and transitive |

## Proofs and countermodels

MleanSeP 1.2 is used for K/T/K4/S4/D/D4; MleanTAP 1.3 for S5. Both are Jens
Otten's unchanged GPL sources, in separate Prolog modules. Only successful
upstream proof search establishes validity. Failure and inference-limit
exhaustion are **inconclusive**, not invalidity.

A finite type-elimination procedure provides proof certificates and
countermodels. It exhaustively considers Boolean assignments to the input's
atoms and distinct boxed subformulas (diamonds are normalized to ¬□¬), then
eliminates types whose modal witness obligations cannot be fulfilled. Reusing
types handles cycles and ensures termination. This is an exhaustive finite
decision method within its resource budget, not a small-model validity heuristic.
See [the algorithm and correctness argument](docs/DECISION-PROCEDURE.md).

For valid formulas, the GUI shows only **Valid in [selected logic]**. Proofs,
certificates and engine attribution are not displayed alongside this verdict.
Proof generation and independent certificate verification still run internally;
the type-elimination tableau renderer remains in the source for future use.

For invalid formulas, the model is evaluated independently against the original
AST and its frame conditions before display. Arrows include all accessibility
edges, including loops and transitive edges. The highlighted root falsifies the
formula. One-way arrows point upward when the one-way relation is acyclic;
reciprocal worlds share a horizontal row whenever compatible with that order.
Directed cycles can make an entirely upward drawing impossible. Longer arrows
bend around intervening worlds. Valuations need not persist along arrows. A table lists every world,
every true atom and every arrow; models of more than 24 worlds use the table
instead of a crowded diagram. Long atom labels are abbreviated only in the
diagram; their full text is in world tooltips and the table.

The worker has a 30-second timeout and can be cancelled. Editing the formula or
changing logic clears old results and cancels an active check. Upstream search
has a 300,000-inference budget. Finite search has limits of 12 independent
atom/box variables, 5,000,000 potential relation pairs and 128 model worlds.
Limits yield **Check incomplete** unless the original engine has already proved
validity. In that case the validity verdict is retained. These limits never
count as invalidity.

## Verify and package

```text
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/preview.mjs
```

The build creates a self-contained static site in `dist/` and a reproducible
`dist/source.zip` with complete application source, upstream engines, runtime,
tests, build instructions and SHA-256 manifest. Serve `dist/` from any static
host. Paths are relative and work under a subfolder. The preview uses
http://127.0.0.1:4176/modprover/ to exercise that case. Nothing is published by
these commands.

For the same GitHub Desktop → GitHub Pages publishing process used for
IntProver, follow [the deployment guide](docs/DEPLOYMENT.md). The included
**Deploy modal prover to GitHub Pages** workflow publishes after pushes to
`main` or a manual run once GitHub Actions is selected in Pages settings.

The tests run the actual WASM engines, check separating modal axioms, validate
countermodels, reject corrupted certificates, and compare the finite procedure
against exhaustive two-world frames for a deterministic formula corpus.

## Licensing and workspace

Application: GNU GPL version 3 or later. Preserve LICENSE, NOTICE.md, the
attribution page and original engine notices when distributing. Runtime:
original bundled BSD-2-Clause notices preserved. ModLeanTAP is not included.
Original source URLs, checksums and provenance are in `vendor/engines.json`.

This project is independent of IntProver. IntProver was read only to adapt the
existing interface and copy its pinned runtime; all edits, tests, builds and
generated artifacts are confined to ModProver.
