# SimpleX Unofficial Catalog
The catalog of SimpleX servers, relays and bots at https://simplex-catalog.asriyan.me: anyone adds one, and the catalog keeps checking whether it works.

## Components
| Directory | What it is | Runs on |
|---|---|---|
| [`frontend/`](frontend) | the web application, in Svelte | GitHub Pages, deployed on every change to `frontend/` on `master` |
| [`supabase/`](supabase) | the database and the edge functions that add servers, relays and bots | Supabase, deployed on every change to `supabase/` on `master` |
| [`validators/servers/`](validators/servers) | checks the SMP servers and writes their status | GitHub Actions, every 12 hours |
| [`validators/relays/`](validators/relays) | checks the relays, over clearnet, Tor, I2P and Yggdrasil | GitHub Actions, every 12 hours |
| [`validators/bots/`](validators/bots) | checks the bots | GitHub Actions, every 12 hours |

Each directory's README says how to run it locally. The workflows are in [`.github/workflows`](.github/workflows), one set per component, each started by changes to its own directory.

## Configuration
Repository variable `FRONTEND_ENV_FILE_CONTENT`: the frontend's [`.env`](frontend/.env), filled in.

Repository secrets:
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`: the Supabase deployment;
- `SERVERS_VALIDATOR_ENV_FILE_CONTENT`, `RELAYS_VALIDATOR_ENV_FILE_CONTENT`, `BOTS_VALIDATOR_ENV_FILE_CONTENT`: each validator's `.env`, filled in.
