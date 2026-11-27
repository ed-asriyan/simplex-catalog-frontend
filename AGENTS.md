# SimpleX Catalog — Agent Guide
Read this fully before making changes. It says what the project is and how work on it proceeds; how it is built is in [`design/README.md`](design/README.md).

## What this project is
The unofficial catalog of SimpleX servers, relays and bots at https://simplex-catalog.asriyan.me. Anyone adds a server, a relay or a bot by its address on the website; validators check every one of them, every 12 hours, and the website shows whether each works, its history, its uptime and, for a bot, what it says and what commands it offers.

## Layout
The root holds the project's projections, each a view of the same catalog:

- `stories/` — how the catalog should behave, as the people who use it see it (`stories/README.md`);
- `design/` — how it is built: its components, what each is responsible for, how they talk, and the schema (`design/README.md`);
- `e2e/` — the end-to-end tests: the stories played against the whole running catalog;
- `src/` — the code: how it works in fact. It is five components, each deployed on its own: `frontend/` (the website, Svelte), `backend/` (the database and the edge functions, on Supabase), and `servers-validator/`, `relays-validator/` and `bots-validator/` (Rust, each run by GitHub Actions on a schedule).

A component's unit tests live in it, beside its code; the root holds what is about the whole catalog. `.github/` and `.devcontainer/` (one dev container per component) are at the root because the tools read them only there.

## Status
The code is implemented and in production. The stories, the design and the end-to-end tests are not written yet; the validators have a few unit tests, the frontend and the edge functions none.

## How work proceeds
Every feature, however small, goes through the same stages, and each stage is reviewed by the maintainer before the next one starts:

1. **User stories.** Change the stories first, if the behaviour changes. They are a living document: they describe the current intended behaviour only; stories that no longer apply are removed, not kept as history (git has the history).
2. **User experience.** The website as the changed stories need it, built for real — every page, element and state, with the stories' texts and its look finished — with stubs behind what later stages write. The maintainer reviews it by using it and from its screenshots. A story with no page has no user experience.
3. **End-to-end tests.** Each changed story played from the outside against the running catalog, with the points where a page is compared with its approved screenshot; they depend on the stories and the website of stage 2 alone, so they come before the design, and they fail.
4. **Design.** The ports (interfaces and the value types they exchange) of every component the stories reach, the edge functions' requests and answers, and the migration the stories need, and `design/README.md` when the stories give a component a new responsibility or interaction, or need a new component — which most stories do not. Those files only: the rest of the code may stop compiling against them. This is what the maintainer decides on; everything behind it is the later stages'.
5. **Unit tests.** The code compiles again with stub bodies where it no longer fits the ports, and unit tests are written against the ports and pure functions. They compile and fail.
6. **Implementation.** Code that makes the unit and end-to-end tests pass, screenshots ignored: the stubs of stage 2 filled and its temporary code removed, the website otherwise as stage 2 built it.
7. **Finalize.** Every end-to-end test run with its screenshots compared: the screenshots the changed stories add or change are taken, judged against the stories and stage 2's review by a subagent, and shown to the maintainer; any other page that changed is a regression, back to stage 6.

A feature that reaches several components is one change: the stories, the design, the tests and the code of every component it touches, in one pull request.

If a later stage needs to deviate from an earlier one, the earlier stage's artefact is updated in the same change, and the maintainer is told.

Write only what is true now, in the stories, the design, code comments and test names. When something is removed or renamed, delete every mention of it: never write that a page, rule or type "no longer exists", "was replaced by", "is gone" or "used to", and never explain a decision by the old state of things.

Each stage is a skill in `.claude/skills/`, started by the maintainer: `/stories`, `/ux`, `/e2e-tests`, `/design`, `/unit-tests`, `/implement`, `/finalize`; `/screenshots` shows the website in the chat at any time. A skill does its own stage only, within the files it names, and stops for review; **never start the next stage on your own**, and never do a stage's work outside its skill. A stage with nothing to change says so instead of inventing work. `/coverage` checks, at any time, which stories the tests do not really cover. The skills hold nothing particular to this project: what they need from it is *Workflow*. They grew from a set other projects started from too (see `.claude/skills/README.md`), and this project keeps its own copy: a change to the method rather than to this project is pointed out to the maintainer, who decides whether the other projects take it.

## Workflow
The project's values the stage skills use.

- **Stories:** `stories/README.md`. A story id is `US-<epic letter><n>`, with an optional lower-case letter for a variant (`US-A1b`); its regex is `US-[A-Z][0-9]+[a-z]?`, and a story is defined as `**US-X1.**` at the start of its item. A story is written as the person sees the website: the page they open, what they type or press, named as the page labels it, and what they read, written out exactly. What a validator finds is written as what the website shows once it has checked: a server *Online*, its uptime, a bot's greeting.
- **UX:** the website, `src/frontend/`: its pages and components (`src/components/`), its stores (`src/store/`), its styles. It runs locally with `make dev_install` and `make dev_serve` in `src/frontend/` (at `http://localhost:5173`), against a local Supabase started with `npx supabase start` in `src/backend/`, whose URL and public key go in `src/frontend/.env`; the local database holds the data of `src/backend/supabase/seed.sql`. A page is reached by its address; a state by the data the database holds, added on the website or by the seed.
- **Stub body:** `todo!()` in Rust; `throw new Error('todo')` in TypeScript (the frontend and the edge functions).
- **Schema snapshot:** none yet.
- **Tests:** a unit test cites its story as `// US-B1` above it. The validators' tests are Rust tests in their crates (`src/*-validator/validator/`); the frontend and the edge functions have none yet.
- **End-to-end tests:** none yet.
- **Not testable by nature:** by end-to-end tests, a server, relay or bot reached over Tor, I2P or Yggdrasil, the country of a server (it comes from a GeoIP database), Sentry and analytics.
- **Only the implementation writes:** none: the website's texts are written by `/ux`.
- **Commands**: the frontend, from `src/frontend/`: build `make prod_build_bundle`, check `npm run check`; the backend, from `src/backend/`: start locally `npx supabase start`; a validator, from `src/<name>-validator/validator/`: build `cargo build`, test `cargo test`, lint `cargo clippy`. Coverage, from the repository root: `.claude/skills/coverage/scripts/story_coverage.sh stories/README.md 'US-[A-Z][0-9]+[a-z]?' 'unit=src:*.rs'`.

## Language
Everything committed to this repository is in **English** — code, comments, docs, commit messages — regardless of the language the conversation with the maintainer happens in. The website speaks English only.

## Design
[`design/README.md`](design/README.md) is how the catalog is built: its components, what each is responsible for and interacts with, the contracts between them (the database and the edge functions), and where code goes. Read it before changing code; its rules hold for every change, inside a stage or not.

## Migrations
The schema is changed by migrations in `src/backend/supabase/migrations/`, applied to production by `supabase db push` when they reach `master` (*Deployment*).

- Files are named `<UTC timestamp>_<description>.sql` (`20260919194029_simplify_server_summaries.sql`) and applied in that order; Supabase records which have run.
- **Never rename, edit or delete a migration that has reached `master`**: it has run against the production database. Change the schema with a new one.
- The validators and the frontend read and write the database: a migration that changes what they use is part of the same change as their code (*How work proceeds*).

## General conventions
- A module's doc comment says what its code cannot: the rule it keeps that its callers rely on, the outside constraint it works around (a messenger's limit, an API's behaviour), why it is built the way it is. It cites the stories it serves. It does not retell the code.
- Keep changes minimal and within the established structure; if a change seems to require breaking a rule of `design/README.md`, stop and ask rather than working around it.

## Deployment
Every commit to `master` is the release of the components it changes: the frontend is published to GitHub Pages, the backend is pushed to Supabase (migrations and edge functions), and the validators run from `master` on their schedule. There is no separate release step, which is why a migration counts as released the moment it lands on `master`. Pull requests build the frontend and dry-run the validators (`.github/workflows/`).
