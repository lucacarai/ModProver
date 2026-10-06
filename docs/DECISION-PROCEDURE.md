# Finite type elimination

The original MleanSeP/MleanTAP sources supply positive proofs. ModProver's
additional semantic procedure supplies terminating decision support,
visualization and countermodels for the propositional fragment.

## Construction

Normalize each diamond A to neg box neg A, and collect all distinct atoms and
boxed subformulas of the resulting formula. Enumerate every Boolean assignment
to this finite collection. Evaluate Boolean connectives classically in each
assignment. Such an assignment is a **type**. No arbitrary bound on modal depth
or on countermodel size is used to conclude validity.

In reflexive systems, reject types where box A is true but A is false. For the
remaining types s and t, allow an edge sRt exactly when:

1. Every box A true in s has A true in t.
2. For K4/S4/D4/S5, every box A true in s is also true in t.
3. For S5, s and t have identical truth assignments to all boxed subformulas.

This maximal relation is reflexive when local reflexivity was imposed. It is
transitive when rule 2 applies: a true box at s propagates through t to u and
its content holds at u. For S5, equal box profiles and local reflexivity also
make the relation symmetric, so each profile class is an equivalence class.

At each elimination round, remove any type s for which:

- Some box A is false at s, but no remaining allowed successor makes A false.
- In serial logics D/D4, there is no remaining allowed successor.

Compute removals simultaneously against the previous round, until no change or
until all types falsifying the input formula have been removed. Each round
strictly decreases the finite set; hence the process terminates.

## Why it is sound and complete

Given any Kripke model of the selected logic, map each world to its type on the
finite collection. Every real edge is allowed by the relation above. Rule 1
holds by box semantics, rule 2 by transitivity, and rule 3 by equivalence of
successor sets in S5. Reflexive worlds satisfy local reflexivity. A false box
always has a real witness, and serial worlds always have a successor. By
induction over rounds, no type realized by this model can be eliminated.
Consequently, if every type falsifying the input has closed, no countermodel
exists: the input is valid.

Conversely, at the fixed point, use all surviving types as worlds and the
allowed relation as accessibility. Assign each atom its type truth value.
The relation has the required frame conditions. Induction on subformulas
establishes the truth lemma: Boolean operations follow the type evaluation;
true boxes hold by rule 1; false boxes have witnesses because the fixed point
has no unfulfilled obligation. Thus a surviving type falsifying the input is a
root of a finite countermodel.

For display, choose a root and one successor witness per false box, adding
serial witnesses where necessary. Reuse already selected types when possible.
Close these edges under reflexivity, symmetry and transitivity as appropriate.
All added edges remain in the allowed maximal relation. The selected model
retains every false-box witness and cannot violate any true box. A separate
verifier checks the original input (including diamonds) using ordinary Kripke
semantics and checks the actual displayed frame conditions.

## Certificates and limits

Validity certificates contain the entire variable collection, all locally
rejected types, all possible falsifying root types, and simultaneous removal
rounds with their failing box or seriality obligation. `verifyProof` reconstructs
the types and relation without using the search's successor cache or witness
construction, checks every removal against earlier rounds, and ensures no
falsifying root survives. This is independent runtime checking, not a claim of
formal verification in a proof assistant.

Enumeration is exponential. The application enforces explicit variable,
potential-edge, inference, world and wall-clock budgets. Exceeding a budget
is inconclusive. It never establishes invalidity. Upstream proof success may
still establish validity when the visualization budget is exceeded.

The finite subformula-model approach is related to filtration and finite-model
arguments described in the [Open Logic Project's modal logic text](https://builds.openlogicproject.org/content/normal-modal-logic/normal-modal-logic.pdf).
The implementation here uses the explicit maximal type relation and elimination
argument above; it does not bundle code from that text or ModLeanTAP.
