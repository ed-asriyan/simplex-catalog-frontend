# Feature workflow skills
Skills for Claude Code that take a feature through seven reviewed stages, each started by the maintainer and each stopping for review:

| Skill | Stage | Changes |
|---|---|---|
| `/stories` | 1. user stories | the stories document |
| `/ux` | 2. user experience | the user interface, for real: every screen, element and state the stories need, with stubs behind it; shown with `/screenshots` and reviewed by using it; nothing to do for a project without a user interface |
| `/e2e-tests` | 3. end-to-end tests | the end-to-end tests and their harness: each changed story played by a user against the whole running system, with the points where it compares a screen where the project has screenshot tests; the new tests fail |
| `/design` | 4. design | the ports, a new migration, and `design/README.md` when a component's responsibilities change; nothing else, even if the rest stops compiling |
| `/unit-tests` | 5. unit tests | stub bodies so the code compiles again, the regenerated schema, and the unit tests; the new tests fail |
| `/implement` | 6. implementation | everything else; all unit and end-to-end tests pass, screenshots ignored |
| `/finalize` | 7. finalize | the approved screenshots: the ones the feature adds or changes, taken once it is implemented, judged by a subagent and shown; every other screen must be as it was; nothing to do for a project without screenshot tests |
| `/screenshots` | any time, read-only | nothing: sends screenshots of the user interface, on a computer and a phone, to the chat |
| `/coverage` | any time, read-only | nothing: reports the stories the tests do not really check, per level |

The skills hold nothing particular to one project: what they need from it is the two files below. Each project keeps its own copy, grown from one set, and the copies may differ where the projects do (one without a user interface has no use for `/ux` or `/finalize`). A change that is about the method rather than one project is pointed out to the maintainer, who decides whether the other projects take it.

## What a project provides

### `design/README.md`
How the project is built, in these sections; the skills refer to them by name:

- `## Overview` — what the system is, the architectural approach (hexagonal, layered, …) and the rules it sets for every change.
- `## Components` — one `### <name>` per component or bounded context, each with **Responsible for:**, **Not responsible for:** and **Interacts with:** (naming the ports or interfaces through which), and the tables it owns, if any.
- `## Source layout` — where each kind of code goes: ports, implementations, migrations, tests. `/design` changes only the ports and the migrations, so this section has to say which files they are.
- `## Schema` — for a project with a database: the whole schema, generated from the migrations and checked by a test, never edited by hand.

It describes the current design only, and is changed by `/design` when a component's responsibilities or interactions change.

### `AGENTS.md`, section `## Workflow`
The project's values the skills use:

- **Stories:** the stories document, the story id format and its regex, how a story is written there.
- **UX:** which code is the user interface, how to run it locally and at which address, and how a screen or a state is reached; or that the project has no user interface.
- **Stub body:** what a body that is not implemented yet is (`todo!()`, `raise NotImplementedError`, …).
- **Schema snapshot:** where the generated whole schema is (usually `design/README.md` *Schema*), and the command that regenerates it.
- **Tests:** how a unit test cites its story, the test helpers, the edge cases the stories have.
- **End-to-end tests:** where they and their harness live, how a test cites its story, how the harness starts the system (the production images, locally), plays a user and moves the clock, and the command that runs them; for a project with a user interface, its screenshot tests: where the approved screenshots are, the devices, the command that runs the tests with screenshots ignored, and the ones that take a new screenshot and take one again.
- **Not testable by nature:** per level (unit, end-to-end), what `/coverage` reports as such rather than as a gap.
- **Only the implementation writes:** the parts of the code that are never stubbed (texts, say), only written.
- **Commands:** build, compile the tests, test, run the end-to-end tests, lint, and the coverage script's arguments: `coverage/scripts/story_coverage.sh <stories file> <story id regex> <level>=<source dir>:<test file glob> …`.

`AGENTS.md` also describes the process itself (the seven stages, that each is reviewed, that no stage starts the next), so an agent working outside a skill knows it.
