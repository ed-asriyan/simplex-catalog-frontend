# SimpleX Servers Registry Validator
Backend service and performs scheduled validation of SimpleX Servers Registry.

Frontend repository: [simplex-servers-registry-frontend](https://github.com/ed-asriyan/simplex-servers-registry-frontend)

## How to run
The project uses [Supabase](https://supabase.com) as storage for servers and their status history. So you should setup
Supabase project first using [the instruction below](#setup-supbase-project). When the project is up and running, you
should setup a validator which will go through servers list in the database and write status history by schedule. There
are two ways to do that: [run locally](#run-locally) (e.g. if you want to self-host it); or
[run on GitHub Acions](#run-on-github-actions).

## Setup Supbase project
1. Setup [Supabase](https://supabase.com) account, create project
2. Run [init_db.sql](./init_db.sql) in `public` schema (e.g using SQL editor page in Supabase project)
3. Enable realtime for the created tables
4. Allow
   * INSERT and SELECT for `public` in `servers` table security policy
   * SELECT for `public` in `servers_status` table security policy

## Run locally
1. Fill variables in [.env](./.env)
2. Run `make validate` by schedule. It's up to you how to organize an automated trigger. For example, you an use
[cron](https://en.wikipedia.org/wiki/cron) or
[systemd.timer](https://documentation.suse.com/smart/systems-management/html/systemd-working-with-timers/index.html)

## Run on GitHub Actions
1. Fill variables in [.env](./.env)
2. Create `ENV_FILE_CONTENT` repository secret
([instruction](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository)),
value of the secret is content of filled out `.env` file
3. Done. The validator will run by schedule. You can dispatch the workflow manually in Actions sections of a repository 