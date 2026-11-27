---
name: implement
description: Stage 6 of a feature — write the code that makes the reviewed unit and end-to-end tests pass, without changing the tests or the design, then stop for review.
argument-hint: what to focus on
disable-model-invocation: true
---

# Stage 6: implementation

You are doing **only** the implementation stage of the process in `AGENTS.md`. $ARGUMENTS

Read `design/README.md` first: the rules of its *Overview* hold for every line you write, and *Source layout* says where each kind of code goes. The project's own values — the commands, the stub body, which parts of the code only this stage writes — are in `AGENTS.md` *Workflow*.

## Input
The stories, the user interface from stage 2 with its stubs and its temporary code, their end-to-end tests, the design (`design/README.md`, the ports, the migration), the stubs and the unit tests: the uncommitted diff. Start from the project's test commands to see what fails.

## Scope
- Fill the stub bodies and whatever the stories require behind them, outside the test files.
- Everything the design left out is yours: applications, pure rule modules, adapters, routers, wiring in the composition root, texts and their wording, and the removal of code a removed feature no longer needs.
- **Don't change tests**, unit or end-to-end. If a test looks wrong, or cannot pass without breaking the stories or the rules of `design/README.md`, stop and explain; the maintainer decides whether the test or the story changes.
- **The user interface stays as stage 2 built it**: fill its stubs with the real code, remove the code it marked as temporary, and change nothing a person sees. Never take or change an approved screenshot: when *Workflow* has screenshot tests, this stage runs the end-to-end tests with screenshots ignored, and `/finalize` compares them. If the real code needs the interface to change, stop and say why; the maintainer decides.
- **Don't change the design.** No new or changed component responsibility in `design/README.md`, port, value type or migration beyond what `/design` wrote. If the code needs one, stop and say why; the maintainer decides, and the change is made to the ports or the migration in the same change, the regenerated schema included.
- A module's doc comment says what its code cannot: the rule it keeps that its callers rely on, the outside constraint it works around, why it is built the way it is. It does not retell the code. Update it when that changes.

## Exit check
1. The project's test command: all unit tests pass, old and new.
2. The project's end-to-end command (with screenshots ignored, when *Workflow* has screenshot tests): all end-to-end tests pass, old and new. If the system cannot run here (no container runtime), say so.
3. The project's lint command: no new warnings in the code you wrote.
4. A search of the source for the stub body, and for the stubs and temporary code of stage 2: nothing left from this feature.
5. You edited no test file in this stage. If you had to, say which and why.

## Finish
Summarise the implementation per component, the exit check results, and **stop**. Suggest `/coverage` if the feature changed many stories. The next stage is `/finalize` when the project has screenshot tests; otherwise the feature is complete once the maintainer accepts it. Do not commit unless the maintainer asks.
