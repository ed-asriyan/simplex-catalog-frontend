---
name: unit-tests
description: Stage 5 of a feature — make the code compile against the reviewed ports with stub bodies, regenerate the schema, and write unit tests against the ports and pure functions; they compile and fail. Then check story coverage and stop for review.
argument-hint: what to focus on
disable-model-invocation: true
---

# Stage 5: unit tests

You are doing **only** the unit tests stage of the process in `AGENTS.md`. $ARGUMENTS

Where unit tests live is in `design/README.md` *Source layout*. The project's own values — the stub body, how the schema is regenerated, how a test cites a story, its test helpers, the edge cases its stories have, the commands — are in `AGENTS.md` *Workflow*. Read both first; if they do not say something this skill needs, ask the maintainer.

## Input
The changed stories, their end-to-end tests and the design: the uncommitted diff of the stories document, the end-to-end tests, `design/README.md`, the ports and the migration. The design stage leaves the code not compiling where it no longer fits the new ports, and its finish lists what the change reaches. If the diff is empty, ask the maintainer what this is about. Read the existing tests next to the code you test, and reuse their fakes and helpers.

## Scope
1. **Make it compile, with stubs and nothing more.** An implementor of a changed port gets the new signature with a stub body; a caller of a changed method gets the new call with the smallest argument that compiles, or a stub around it; a new inbound port gets a bare application (type, constructor, implementation with stub bodies) so the tests can construct it; a new module gets its declaration and an empty test file, as the project lays them out. A body that is more than a stub, a constructor or a trivial field access belongs to `/implement`. Never change a port: if the code cannot compile without that, stop and say what the design lacks.
2. **Regenerate the schema** in `design/README.md`, if the design added a migration, with the project's command.
3. **Write the unit tests**, in test files and test-only helpers. The end-to-end tests are stage 3's and stay as they are. If a test cannot be written against the ports (a port is missing, a type is not reachable), stop and say what the design lacks.

## Rules
- Every test cites the story it checks, in the project's style. A test of a rule no story states (a schema constraint, a protocol limit) says in a comment which rule it checks and why it exists.
- Test behaviour through the inbound ports and pure functions, with fakes for outbound ports; storage adapters against the real database as the project's test helpers set it up.
- Cover each changed story's main case and its edge cases, those *Workflow* lists included; pass "now" in for every time boundary.
- Assert observable results — return values, notifications sent, rows stored, exact texts where the story gives a wording — not internal calls.
- A test of behaviour that already works and is unchanged is fine to add, but say so: it will pass now.

## Exit check
1. The tests compile (the project's command for compiling tests without running them), and outside the test files the diff of this stage is stubs only.
2. The project's test command: the new tests **fail**, by the stubs or by failed assertions. List which fail and how. A new test that passes needs a reason (see the last rule).
3. Run the coverage script as *Workflow* gives it and confirm every story changed in stage 1 is cited by a unit test, unless *Workflow* says it is not testable by unit tests by nature.

## Finish
Show the unit tests added per story, the exit check results, and **stop**. The next stage is `/implement`, run by the maintainer after review.
