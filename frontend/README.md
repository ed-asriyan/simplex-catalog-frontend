# SimpleX Unofficial Directory Frontend [![CD](https://github.com/ed-asriyan/simplex-directory-frontend/actions/workflows/CD.yml/badge.svg)](https://github.com/ed-asriyan/simplex-directory-frontend/actions/workflows/CD.yml)
Web application built on Svelte.js and Supabase for https://simplex-directory.asriyan.me

# Setup
## Init
1. Setup Supabase project as described [here](https://github.com/ed-asriyan/simplex-directory-servers-validator?tab=readme-ov-file)
2. *(optional)* Setup [Google Analytics](https://analytics.google.com)
3. *(optional)* Setup [Sentry](https://sentry.io) account and create Svelte project
4. Create `ENV_FILE_CONTENT` repository variable and copy content of filled by you [.env](.env) file in it

## Local development
1. Install docker
2. Install dependencies:
   ```console
   make dev_install
   ```

Now you can run the dev server locally:
```console
make dev_serve
```

## Generate prod bundle
```console
make prod_build_bundle
```

## GitHub Actions
* Each push to `master` triggers deployment to production
* Make sure that `ENV_FILE_CONTENT` repository variable is filled
