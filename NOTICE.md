# ModProver notices

New and adapted application code is GNU GPL version 3 or later. See LICENSE.
Adaptation date: 6 October 2026.

## Modal engines, unchanged

- MleanSeP 1.2, 30 August 2011; copyright (c) 2006–2011 Jens Otten.
  Source: https://www.leancop.de/mleansep/programs/mleansep12_swi.pl
- MleanTAP 1.3, 24 February 2012; copyright (c) 2006–2012 Jens Otten.
  Source: https://www.leancop.de/mleantap/programs/mleantap13_swi.pl

Retrieved on 6 October 2026. Both source headers grant the GNU General Public
License without specifying a version. Distributed here under GPL-3.0-or-later.
The original files and notices are preserved. New adapters use separate modules
and dynamically select each engine's logic. Upstream sources are not modified.
ModLeanTAP is excluded because redistribution permission was not established.

## IntProver interface

The formula parser, MathML preview, stylesheet and ZIP helper are adapted from
the GPL-3.0-or-later IntProver application (5–6 October 2026). No fCube engine is
bundled in ModProver. ModProver's finite type-elimination algorithm, proof and
model verifiers, diagrams and integration are new GPL-3.0-or-later additions.

## SWI-Prolog WebAssembly

swipl-wasm 8.1.4, copied unchanged from IntProver's pinned package. Package
metadata and original license are in vendor/package/; registry metadata is in
vendor/swipl-metadata.json. The package is BSD-2-Clause, with original SWI-Prolog
notices preserved. See https://www.npmjs.com/package/swipl-wasm/v/8.1.4 and
https://www.swi-prolog.org/license.html for upstream provenance.

The build supplies the exact corresponding application source, original Prolog
sources, bundled runtime package, notices, tests and build instructions in
source.zip, with a SHA-256 manifest. No third-party service or installation is
required to run the application.
