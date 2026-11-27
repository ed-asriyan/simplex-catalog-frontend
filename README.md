# SimpleX Unofficial Catalog
The catalog of SimpleX servers, relays and bots at https://simplex-catalog.asriyan.me: anyone adds one, and the catalog keeps checking whether it works.

## Layout
The root holds the project's projections, each a view of the same catalog:

| Directory | Projection |
|---|---|
| `stories/` | how the catalog should behave, as the people who use it see it |
| `design/` | how it is built: its components, what each is responsible for, how they talk |
| `e2e/` | the end-to-end tests: the stories played against the whole running catalog |
| [`src/`](src) | the code: how it works in fact |

## Components
The code is six components, each deployed on its own; `src/backend/` holds two, the database and the functions, as the one Supabase project they are deployed to:

| Directory | What it is | Runs on |
|---|---|---|
| [`src/frontend/`](src/frontend) | the web application, in Svelte | GitHub Pages, deployed on every change to it on `master` |
| [`src/backend/`](src/backend) | the database and the edge functions that add servers, relays and bots, on Supabase | Supabase, deployed on every change to it on `master` |
| [`src/servers-validator/`](src/servers-validator) | checks the SMP servers and writes their status | GitHub Actions, every 12 hours |
| [`src/relays-validator/`](src/relays-validator) | checks the relays, over clearnet, Tor, I2P and Yggdrasil | GitHub Actions, every 12 hours |
| [`src/bots-validator/`](src/bots-validator) | checks the bots | GitHub Actions, every 12 hours |

Each component's README says how to run it locally. The workflows are in [`.github/workflows`](.github/workflows), one set per component, each started by changes to its own directory.

## Configuration
The workflows read their settings from the repository's secrets and variables (GitHub: **Settings → Secrets and variables → Actions**, the **Secrets** and **Variables** tabs, **New repository secret** / **New repository variable**). A secret is what must not be seen; a variable, what may: everything the website is built with is in the pages it serves, so it is a variable. The workflows write each component's `.env` from them.

Secrets:

| Name | Used by | Where it comes from |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | the three validators (`SUPABASE_KEY` of their `.env`) | Supabase dashboard, the project → **Project Settings → API Keys** → the secret key (`sb_secret_…`, or the legacy `service_role` one) |
| `SUPABASE_ACCESS_TOKEN` | the deployment of the database and the functions | Supabase dashboard → **Account → Access Tokens** ([supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)) → **Generate new token** |
| `SUPABASE_DB_PASSWORD` | the deployment of the database | the database password set when the project was made; **Project Settings → Database → Reset database password** makes a new one |

Variables:

| Name | Used by | Value |
|---|---|---|
| `SUPABASE_PROJECT_ID` | the deployment of the database and the functions | the project's reference ID: **Project Settings → General**, the `<ref>` of `https://<ref>.supabase.co` |
| `SUPABASE_URL` | the website (`VITE_SUPABASE_URL`) and the validators (`SUPABASE_URL`) | `https://<ref>.supabase.co`, **Project Settings → Data API** |
| `SUPABASE_ANON_KEY` | the website (`VITE_SUPABASE_KEY`) | **Project Settings → API Keys** → the publishable key (`sb_publishable_…`, or the legacy `anon` one) |
| `WEBSITE_URL` | the website (`VITE_URL`) | `https://simplex-catalog.asriyan.me` |
| `SIMPLEX_GROUP_LINK` | the website (`VITE_SIMPLEX_GROUP_LINK`) | the link of the catalog's SimpleX group, which **Join the group chat** opens |
| `SENTRY_DSN` | the website (`VITE_SENTRY_DSN`), optional | Sentry, the project → **Settings → Client Keys (DSN)** |
| `ANALYTICS_MEASUREMENT_ID` | the website (`VITE_ANALYTICS_MEASHUREMENT_ID`), optional | Google Analytics → **Admin → Data streams** → the stream → **Measurement ID** (`G-…`) |
| `VALIDATORS_RETRY_COUNT` | the three validators (`RETRY_COUNT`), optional | how many times a validator asks again after the first try; `3` when it is not set |
