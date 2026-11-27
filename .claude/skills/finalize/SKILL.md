---
name: finalize
description: Stage 7 of a feature — run every end-to-end test against the implemented system with its screenshots compared, take the screenshots the feature adds or changes, have them judged, show them, and stop for review. Nothing to do for a project without screenshot tests.
argument-hint: what to focus on
disable-model-invocation: true
---

# Stage 7: finalize

You are doing **only** the finalize stage of the process in `AGENTS.md`. $ARGUMENTS

The earlier stages ran the end-to-end tests with their screenshots ignored: what a screen shows is only final once the feature is implemented, behind the interface as well as on it. This stage takes the screenshots of what the feature changed, and checks that nothing else changed, so the approved screenshots are what the maintainer saw, and every other screen is still as it was.

The project's own values — where the approved screenshots are, the devices, the command that runs the end-to-end tests, the one that ignores screenshots, and the one that takes a screenshot again — are in `AGENTS.md` *Workflow*, under *End-to-end tests*. Read it first. If the project has no screenshot tests, say that this stage has nothing to do, and stop. If *Workflow* does not say something this skill needs, ask the maintainer.

## Input
The stories changed by stage 1, the screenshots of stage 2's review, and the end-to-end tests of stage 3, with the points where they compare a screen: the uncommitted diff (if empty, the last commits that touched the stories, or ask the maintainer which stories this is about). Read those stories in full.

## Scope
- Write only the approved screenshots: take the missing ones and take again the ones the changed stories change.
- Never change the system, the stories or any test. A screenshot that should not change, and did, is not taken again here.

## Steps
1. **Run every end-to-end test, screenshots compared.** A failure that is not a screenshot (an assertion, the harness) is not this stage's: stop and report it; the next stage is `/implement` again.
2. **Sort the screenshot failures**, each by its test and name:
   - *new*: no approved screenshot yet — a point stage 3 added;
   - *changed on purpose*: a screen the changed stories change, and the difference is what they say (a new field, a new text, a new state);
   - *regression*: any other difference — a screen the stories do not touch, or a change they do not ask for.
   Look at the difference itself (the test's output has the expected, the actual and their diff), not only at the name.
3. **On a regression, stop**: take nothing, report each with its difference and the story it breaks, and the next stage is `/implement` again.
4. **Take the new and the changed-on-purpose screenshots** with the command *Workflow* gives, only those, then run the end-to-end tests again: all pass.
5. **Have them judged**: hand every screenshot taken in step 4, the changed stories, and the screenshots of stage 2's review to a **subagent** (general-purpose), so they are judged by eyes that did not make them, with this task:

   > For each screenshot, read the story it serves and say whether the screen shows what the story says — every text word for word, every element, every state — and whether it looks as the stage 2 screenshot of the same screen did. Report each difference, with the screenshot, what the story or the stage 2 screenshot says, and how serious it is: wrong (the story is not met), different (met, but not as reviewed), cosmetic. Also report what is broken whatever the stories say: overlapping or cut-off elements, text out of its box, something off the screen on a phone. Don't edit any file.

   The judgement is advice for the maintainer, not a gate: show it, and change nothing for it.

## Exit check
1. Every end-to-end test passes, screenshots compared.
2. The screenshots taken are the new and the changed-on-purpose ones of the changed stories; no other approved screenshot changed (check the diff).

## Finish
Send the screenshots taken to the maintainer — new and changed, a few at a time, each with a caption saying the screen, the state, the device, and for a changed one what changed and by which story — if a tool that sends files is available, otherwise list their paths. Then the judge's findings, the exit check results, and **stop**. The feature is complete once the maintainer accepts it; what they find wrong goes back to the stage it belongs to.
