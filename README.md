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
The code is five components, each deployed on its own:

| Directory | What it is | Runs on |
|---|---|---|
| [`src/frontend/`](src/frontend) | the web application, in Svelte | GitHub Pages, deployed on every change to it on `master` |
| [`src/backend/`](src/backend) | the database and the edge functions that add servers, relays and bots, on Supabase | Supabase, deployed on every change to it on `master` |
| [`src/servers-validator/`](src/servers-validator) | checks the SMP servers and writes their status | GitHub Actions, every 12 hours |
| [`src/relays-validator/`](src/relays-validator) | checks the relays, over clearnet, Tor, I2P and Yggdrasil | GitHub Actions, every 12 hours |
| [`src/bots-validator/`](src/bots-validator) | checks the bots | GitHub Actions, every 12 hours |

Each component's README says how to run it locally. The workflows are in [`.github/workflows`](.github/workflows), one set per component, each started by changes to its own directory.

## Configuration
Repository variable `FRONTEND_ENV_FILE_CONTENT`: the frontend's [`.env`](src/frontend/.env), filled in.

Repository secrets:
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`: the backend's deployment to Supabase;
- `SERVERS_VALIDATOR_ENV_FILE_CONTENT`, `RELAYS_VALIDATOR_ENV_FILE_CONTENT`, `BOTS_VALIDATOR_ENV_FILE_CONTENT`: each validator's `.env`, filled in.
