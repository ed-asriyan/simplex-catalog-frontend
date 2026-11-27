---
name: screenshots
description: Take screenshots of the project's user interface — the screens and states asked for, on a computer and on a phone — and send them to the person in the chat, so a change to the interface can be reviewed without opening it. Use after a stage changed the user interface, or when the maintainer asks to see a screen.
argument-hint: the screens and states to show; the ones the current change touches by default
---

# Screenshots

Show the user interface as a person sees it, without them having to run it: the screens and states asked for ($ARGUMENTS; by default every screen and state the current change touches), each on a computer and on a phone.

The project's own values — how to run its user interface locally, at which address, and how to reach a screen or a state — are in `AGENTS.md` *Workflow*, under *UX*. Read it first. If it says the project has no user interface, say so and stop.

## Steps
1. **Run the interface** with the command *Workflow* gives, in the background, and wait until its address answers. Use what is running already if it is.
2. **List the shots**: one per screen and state, each a `name` (`apply-dialog-no-change`), the address that opens it, and the steps a person takes from there, if any — clicks, text typed, options picked, keys pressed — naming each element by its role and accessible name, as a person finds it. A state is reached the way the stage that built it says (an address, a link, an action on the page).
3. **Take them**: write the list as JSON to a scratch file and run `.claude/skills/screenshots/scripts/shoot.js <list.json> <out dir>`, with Playwright installed, the out directory outside the repository (a scratch or temporary directory). It writes `<name>-computer.png` and `<name>-phone.png`, the whole page each, and prints their paths; a shot whose element is not found fails with the reason, which is a finding to report, not to work around.
4. **Look at them** before sending: each must show what its name says. A shot that shows something else is retaken or reported.
5. **Send them** to the person, if a tool that sends files into the conversation is available: a few at a time, each group with a one-line caption saying the screen, the state and the device, phone shots first. Without such a tool, list the files' paths, and the address to open the interface locally.

## Rules
- Change nothing in the repository: no code, no fixtures, no docs. A state that cannot be reached without a change is reported, not created.
- Stop the interface you started once the shots are taken.
