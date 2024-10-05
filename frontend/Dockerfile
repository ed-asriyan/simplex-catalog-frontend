FROM node:18 as dev

FROM dev as base

WORKDIR /app

COPY .npmrc .
COPY package.json .
COPY package-lock.json .

RUN npm ci
# https://github.com/npm/cli/issues/4828#issuecomment-1972072806
RUN npm i --no-save -O @rollup/rollup-linux-x64-gnu @rollup/rollup-linux-arm64-gnu

COPY svelte.config.js .
COPY tsconfig.json .
COPY tsconfig.node.json .
COPY vite.config.ts .
COPY index.html .
COPY static static
COPY src src

FROM base as builder
ARG VITE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_KEY
ARG VITE_SUPABASE_SERVERS_TABLE_NAME
ARG VITE_SUPABASE_SERVERS_QUICK_VIEW_TABLE_NAME
ARG VITE_SENTRY_DSN
ARG VITE_ANALYTICS_MEASHUREMENT_ID
ARG NODE_ENV

RUN npm run build -- --mode $NODE_ENV

FROM scratch as bundle
COPY --from=builder /app/dist /dist
ENTRYPOINT sh

FROM nginx as app
COPY --from=bundle /dist /var/www/html/
COPY nginx.conf /etc/nginx/nginx.conf
