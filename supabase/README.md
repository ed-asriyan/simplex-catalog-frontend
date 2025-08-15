# SimpleX Directory Supabase
This is database and backend service for https://simplex-directory.asriyan.me.

# How to run locally
## Recommended: Use Dev Container
For the best experience, open this repository in a [GitHub Codespace](https://github.com/features/codespaces) or a local [devcontainer](https://containers.dev/). This will ensure all dependencies and tools are set up automatically.

## How to run locally (manual)
If you are not using a devcontainer, you can run the project locally with:

```
supabase start
supabase functions serve
```

# Production Deployment (GitHub Actions)
This repository uses a GitHub Actions workflow to automatically deploy to production on every commit to the `master` branch.

## Required GitHub Secrets
You must add the following secrets to your GitHub repository:

- `SUPABASE_ACCESS_TOKEN`: A personal access token with permissions to deploy to your Supabase project.
- `SUPABASE_PROJECT_ID`: The project reference ID of your Supabase project (e.g., `abcd1234xyz`).

## How to deploy
1. Add the required secrets to your GitHub repository ([Settings > Secrets and variables > Actions](https://github.com/<your-org-or-user>/<your-repo>/settings/secrets/actions)).
2. Push to `master` branch. The workflow in `.github/workflows/deploy.yml` will deploy your changes automatically.
