---
name: ux
description: Stage 2 of a feature — build the user interface the reviewed stories need, for real: every screen, element and state, with its texts and its look, and stubs behind what later stages write. Nothing to do for a project without a user interface. Then show it and stop for review.
argument-hint: what to focus on
disable-model-invocation: true
---

# Stage 2: user experience

You are doing **only** the user experience stage of the process in `AGENTS.md`. $ARGUMENTS

This stage builds the user interface the stories are played on, as the real code it will stay: every screen and dialog, every element a person sees and uses, every state the stories have, with the stories' texts word for word and its look finished. What is behind the interface — what the later stages design and implement — is a stub here. The maintainer reviews the interface by using it; once it is right, the end-to-end tests are written against it, and the later stages fill the stubs without redesigning it.

The project's own values — which code is the user interface, how to run it locally, and how a screen or a state is reached — are in `AGENTS.md` *Workflow*, under *UX*. Read it first. If it says the project has no user interface, say that this stage has nothing to do, and stop: the next stage is `/e2e-tests`. If *Workflow* does not say something this skill needs, ask the maintainer.

## Input
The stories changed by stage 1: the uncommitted diff of the stories document (if empty, the last commits that touched it, or ask the maintainer which stories this is about). Read those stories in full, and the user interface as it is for the screens they touch.

If a story cannot be built without deciding what the story leaves open — which element starts it, what a person sees when it fails — **don't decide it here**: stop, say what is missing, and propose the change to the story.

## Scope
- Write the user interface's code, as *Workflow* names it: screens, elements, states, texts, styles, and its client-side behaviour where it is the interface's own (showing, hiding, moving between screens).
- **Stub what the interface calls and later stages write**: a request to a backend, a rule of the domain, a computation the stories ask for. A stub is the smallest code that lets a person go on through the flow — fixed data, a canned answer, nothing done — and is marked as a stub where it is. Leaving one behind is caught later: the end-to-end tests check the real outcome and fail on it.
- Never change the stories, the backend, the ports, the schema or any test. When *Workflow* has screenshot tests, those of the screens this stage changes fail until `/finalize` takes them again: that is expected, and they are not updated here.

## Rules
- **Every flow of the changed stories can be gone through** in the running interface, each step showing what the story says, its texts word for word.
- **Every state the stories have can be reached** — empty, an error, a refusal, a limit passed, a long list, a phone: by what the product already offers (an address, a link it sends, an action on the page) when it can be, otherwise by code of this stage alone (a parameter, a control, a fixture), marked as temporary, which `/implement` removes. The way to reach each state is part of this stage's report.
- **Every element a person uses has a role and an accessible name**: a native control, or a role given; a name that says what it does, never only a symbol. The end-to-end tests find elements by them.
- Follow the interface's existing look and components; a new one is made of them.

## Review
1. **Show it**: run `/screenshots` for every screen and state the change touches, so the maintainer can review it from a phone; and give the address and the steps to open it locally.
2. **Have it judged**: hand the running interface, the changed stories and the list of states to a **subagent** (general-purpose), so it is judged by eyes that did not build it, with this task:

   > Use this interface as a person would, through every flow of these stories and every listed state. Evaluate it against Jakob Nielsen's ten usability heuristics: visibility of system status; match between the system and the real world; user control and freedom; consistency and standards; error prevention; recognition rather than recall; flexibility and efficiency of use; aesthetic and minimalist design; help users recognise, diagnose and recover from errors; help and documentation. Also check that every element a person must use can be reached by role and accessible name and by keyboard. For each problem, report the heuristic, the screen and element, its severity from 0 (not a problem) to 4 (a usability catastrophe), and a proposed fix. Don't edit any file.

   The review is advice for the maintainer, not a gate: show it, and apply none of it unasked.

## Exit check
1. Every flow of the changed stories goes through in the running interface, with the stories' texts.
2. Every state of the changed stories is reached, and the report says how.
3. Every element a person uses in them has a role and an accessible name.
4. The project's build and lint commands pass, for the interface's code.
5. The screenshots are sent, or their paths listed.

## Finish
List per story the screens, elements and states it got, the stubs and the temporary code this stage left for later stages, how to reach each state, the review's findings, and **stop**. The next stage is `/e2e-tests`, run by the maintainer after review.
