# SimpleX Directory Bots Validator
Backend service and performs scheduled validation of bots in [SimpleX Directory](https://simplex-directory.asriyan.me).

Frontend repository: [simplex-directory-frontend](https://github.com/ed-asriyan/simplex-directory-frontend)

## How to run
The project uses [Supabase](https://supabase.com) as storage for bots and their status history. So you should setup
Supabase project first using [the instruction below](#setup-supabase-project). When the project is up and running, you
should setup a validator which will go through bots list in the database and write status history by schedule. There
are two ways to do that: [run locally](#run-locally) (e.g. if you want to self-host it); or
[run on GitHub Acions](#run-on-github-actions).

## Setup Supabase project
Read [simplex-directory-supabase](https://github.com/ed-asriyan/simplex-directory-supabase)

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
