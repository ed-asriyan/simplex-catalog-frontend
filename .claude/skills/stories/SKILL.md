---
name: stories
description: Stage 1 of a feature — change the user stories and nothing else, then stop for the maintainer's review.
argument-hint: the behaviour to add or change
disable-model-invocation: true
---

# Stage 1: user stories

You are doing **only** the user-stories stage of the process in `AGENTS.md` for: $ARGUMENTS

The project's own values — where the stories are, how a story id looks, how stories are written there — are in `AGENTS.md` *Workflow*. Read it first, and `design/README.md` *Overview* and *Components*, so the stories use the system's terms. If they do not say something this skill needs, ask the maintainer.

## Scope
- Edit the stories document.
- If you renumber stories, also update the references to the old ids wherever they are (code comments, tests, other docs). No other change.
- Touch nothing else: no design, no ports, no schema, no code, no tests.

## Steps
1. Read the stories document in full, so the new stories stay consistent with the rest.
2. If the behaviour is ambiguous (a case the request does not decide, a conflict with an existing story), ask the maintainer before writing.
3. Decide which stories the request touches. A story is one user flow: **one** thing a person does, or one thing that happens to them, and what they get back — opening a page or a chat and what it shows, pressing one control and what follows, sending one message or entering one value and the answer to it, one thing the system does on its own and what a person then sees. Not a feature described whole: a page with ten controls is the story of opening it, then a story per control.
   - **The request changes what happens in a flow that already has a story** (another reply, a different text, a new case of the same action): **edit that story in place**. Do not add a story, a sub-story or a note elsewhere that patches it. Each existing story whose flow is affected gets the change; if the same outcome is described in several stories, update each one.
   - **Add a new story only for a new flow**: a person can do something they could not do before, or the system does something on its own in a situation no story covers.
   - **Cases of one action that differ only by the value given and the answer to it** (each refusal of a form or a command) are variants of one story, each a story of its own with the story's id and a letter: `US-C20`, `US-C20b`, `US-C20c`.
4. Write every story in exactly this form, a single sentence on the list item that defines it, in the project's id style (*Workflow*):

   ```markdown
   - **US-X1.** As a <role>, when <one action or event>, <what I get>.
   ```

   - **The role** is who acts, or, for something the system does on its own, who sees it. A precondition is part of it: "As a visitor on a phone", "As a partner in an inactive pair".
   - **The action** is one, concrete and physical, with real values: "when I send `/timezone Berlin`", "when I click **Add server anonymously**"; never an abstraction such as "when I change a setting", never two ("and then"). For the system, an event: "when the catalog's check finds the server answering", "when the reminder's time comes".
   - **What I get** is what each person involved observes. The sentence ends with ".", or with ":" when the exact output follows.
   - **Under the sentence, only** the exact output it promised — the text, in a quote or a `text` block, a table of what is shown, a list of what a page holds — and notes that clarify the sentence: a rule that holds (who owns what, what persists), a limit, where something is kept. Never a further action and what it does: that is another story. A button or a link shown is listed by what it reads; what pressing it does is the story of pressing it.
   - The exact wording of any text that matters is written out in the story itself; don't send the reader to another story for "the same reply".
   - Where an action leads is written out exactly: the address of the page it opens, the chat it opens, the link it follows, not just "the settings page".
   - A link the person sees is written as a Markdown link, its text and where it leads, `[text](https://example.com/path)`, inside the quoted text it belongs to.
5. Write the stories as the current intended behaviour: rewrite or remove stories that no longer apply, don't keep history. A removed or renamed behaviour is simply not mentioned: never write that it "no longer exists", "was replaced" or "is gone".
6. A new flow gets a new id; never renumber to make room. If you do renumber, grep the repository for every old id and list the test files a later stage will have to update.
7. If the request does not change behaviour (a refactoring, a rename in code), say so and change nothing.

## Finish
Run `.claude/skills/stories/scripts/story_format.py <stories document> '<story id regex>'` (both from *Workflow*): it checks the sentence of every story, and must report none out of shape — fix each it reports, the stories this request did not touch included. Whether what is under a sentence holds a further action it cannot tell: read every story you wrote for that yourself.

Show the diff of the stories document, list the story ids you added, changed or removed, and **stop**. The next stage is `/ux`, run by the maintainer after review.
