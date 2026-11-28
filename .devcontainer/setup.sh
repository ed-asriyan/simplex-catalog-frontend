#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  build-essential \
  libssl-dev \
  pkg-config \
  python3 \
  unzip
sudo rm -rf /var/lib/apt/lists/*

if ! command -v deno >/dev/null 2>&1; then
  curl -fsSL https://deno.land/install.sh | sudo DENO_INSTALL=/usr/local sh -s -- --yes
fi

git lfs install
git lfs pull || true

npm --prefix src/frontend ci
npm --prefix e2e ci
./e2e/node_modules/.bin/playwright install chromium --with-deps
