---
name: e2e-tests
description: Stage 3 of a feature — write end-to-end tests of the reviewed stories against the whole running system, driven from the outside as its user drives it; the new ones fail. Nothing but the end-to-end tests changes. Then stop for review.
argument-hint: what to focus on
disable-model-invocation: true
---

# Stage 3: end-to-end tests

You are doing **only** the end-to-end tests stage of the process in `AGENTS.md`. $ARGUMENTS

An end-to-end test is a story run for real: the system as it is deployed (its production images, started locally), and a test that plays the user from the outside — through the same client a user has — and checks exactly what the user sees. It knows nothing of the system's code, so it is written before the design: it depends on the stories alone.

The project's own values — where the end-to-end tests and their harness live, how a test cites a story, how the harness starts the system, plays a user and moves the clock, the command that runs them, which stories cannot be caused from outside — are in `AGENTS.md` *Workflow*. Read it first; if it does not say something this skill needs, ask the maintainer.

## Input
The stories changed by stage 1 and, for a story played through a user interface, that interface as stage 2 built it, with the way it reaches each state: the uncommitted diff (if empty, the last commits that touched them, or ask the maintainer which stories this is about). Read those stories in full, use that interface, and read the existing end-to-end tests, and reuse their helpers.

A test reaches an element of a screen as a person does — by its role and its accessible name — never by its markup, its classes or its position, and reaches a state the way a person can, never through code stage 2 marked as temporary. An element with no accessible name, or a state a person cannot reach, is a gap of stage 2: stop and say so.

Stage 2 left stubs behind the interface: a test checks the real outcome the story names, so it fails on a stub.

If a story cannot be checked as written — it does not say what the user sees, or leaves a value open — **don't guess**: stop, say what is missing, and propose the change to the story.

## Scope
- Edit only the end-to-end tests and their harness. A harness change is one any test could use (a new kind of thing the user sees, a new way to act), never one that reaches into the system's code or data.
- Never change the system: no code, no ports, no schema, no stories, no unit tests.

## Rules
- **Every story changed in stage 1 gets end-to-end tests**, each citing it in the project's style. They check every behaviour the story states: its main case, each variant it lists, each refusal, and each value it names — the exact text of every message it writes out.
- Act and observe only as the user does: through the user's client, with the user's inputs. A time the story depends on is reached by moving the system's clock through the harness, never by waiting it out or by touching the system's data.
- A test sets up what it needs itself, from scratch, as a new user; it does not rely on what another test left behind.
- A story that cannot be caused from outside (an internal failure) is said so in a comment where its test would be, and left to the unit tests.
- **Screenshots, when *Workflow* has screenshot tests.** Where a story says what a person sees on a screen — a screen opened, a dialog, a warning, an empty or a refused state — the test also compares that screen with its approved screenshot, at that point of the test, by a name that says the state (`apply-dialog-no-change`). Nothing in the frame may change from run to run (a generated name, a timestamp): such a screen is reached with fixed values, or not compared. This stage only places these points: the screenshots themselves are taken by `/finalize`, once the feature is implemented, and this stage runs the tests with screenshots ignored (*Workflow*).

## Exit check
1. The end-to-end tests compile.
2. Run them with the project's command (with screenshots ignored, when *Workflow* has screenshot tests). The new tests **fail**, by their assertions: the behaviour is not there yet. A new test that passes checks behaviour that already exists; say so. A failure of the harness itself (the system did not start, the user could not connect) is not a result: fix it, or say what stops it. If the system cannot run here at all (no container runtime), say so, and that compiling is all this check could do.
3. Run the coverage script as *Workflow* gives it and confirm every story changed in stage 1 is cited by an end-to-end test.
4. No approved screenshot was taken or changed in this stage.

## Finish
Show the tests added per story, the screenshot points added, the exit check results, and **stop**. The next stage is `/design`, run by the maintainer after review.
