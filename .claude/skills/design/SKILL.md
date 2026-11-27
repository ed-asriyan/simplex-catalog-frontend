---
name: design
description: Stage 4 of a feature — change the interface the reviewed stories need: the ports (interfaces and the value types they exchange), a new migration, and design/README.md when a component's responsibilities change. Only those files; the rest of the code may stop compiling. Then stop for review.
argument-hint: what to focus on
disable-model-invocation: true
---

# Stage 4: design

You are doing **only** the design stage of the process in `AGENTS.md`. $ARGUMENTS

The design is what the maintainer decides on: **which component is responsible for what (`design/README.md` *Components*), how each can be driven and what it needs from outside (its ports), and how the data is stored (the schema).** Everything behind it is decided by later stages. The ports and the migration are written as real code, and they are the only code this stage changes, so its diff is the interface change and nothing else.

Read `design/README.md` in full first: its *Overview* is the architecture and the rules every change keeps, *Components* says what each component is responsible for, is not responsible for and interacts with, and *Source layout* says where the ports and the migrations are. The project's own values are in `AGENTS.md` *Workflow*. If they do not say something this skill needs, ask the maintainer.

## Input
The stories changed by stage 1, the user interface from stage 2 with its stubs, and their end-to-end tests from stage 3: the uncommitted diff (if empty, the last commits that touched the stories, or ask the maintainer which stories this is about). Read those stories in full, the ports of every component they concern, and the schema in `design/README.md`.

If the stories turn out incomplete or contradictory, **don't fix them silently**: stop, explain the problem, propose the change to the stories, and make it only once the maintainer agrees.

## Scope
Change these, and no other file:

1. **`design/README.md`, when there is something to change.** Decide, by *Components*, which component owns each changed story. Most stories fit what a component already does, and the document stays as it is. Change it only when a story needs a responsibility no component has, an interaction between components that is not listed, a new component, or a new kind of code *Source layout* has no place for. A story that falls under a component's *Not responsible for* is not moved there silently: say so in the finish, with what you changed and why. *Overview* changes only when the maintainer asks. Leave *Schema* alone: it is generated, by the next stage.
2. **The ports.** The new and changed inbound ports (one interface per use case), outbound ports and the value types they exchange, in the files *Source layout* names for them, and nothing that is private to a component. Each interface, method and type that serves a story carries a doc comment citing its id. The doc comment says what the caller can rely on (what a method returns, refuses, changes, whom it tells), not how it is done. A removed port or type is removed here.
3. **The migration.** When storage changes: a **new** migration (tables, columns, constraints, indexes, cascades, and the backfill of existing rows), never an edit of a released one. A table belongs to one component, as *Components* says; a new table is added to its owner there.

Everything else stays as it is, even where it no longer compiles against the new ports: implementors, callers, applications, adapters, unit tests, end-to-end tests, texts, wiring. Making it compile again is the next stages' work.

If the stories need no change to the ports or the schema (a wording change, say), say so and change nothing.

Write the current interface only: a removed or renamed component, port, type or column is simply gone, and neither the design nor a doc comment says what was there before.

## Exit check
1. The diff touches only `design/README.md`, the ports and the new migration.
2. Run the project's build command: the ports themselves must have no errors of their own (syntax, an unknown type). The errors elsewhere are the change's reach; keep them for the finish.

## Finish
Show the diff, then a short list per changed story: which component owns it, which ports and types serve it, which tables and columns it stores. Name what the ports cannot show and you had to decide: what carries a call between components, and a rule the schema enforces. Then **what the change reaches**: from the build errors and a search for the changed names, the implementors and callers that no longer fit and the tests that use them, by component. Then **stop**. The next stage is `/unit-tests`, run by the maintainer after review.
