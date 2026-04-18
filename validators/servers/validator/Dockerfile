FROM rust:1.95 AS dev

FROM dev AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src src

RUN cargo build --release


FROM debian:stable-slim as validate

RUN apt-get update \
    && apt-get install -y libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ADD https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb ./GeoLite2-Country.mmdb
COPY --from=builder /app/target/release/validator ./validator

ENV SUPABASE_URL=
ENV SUPABASE_KEY=
ENV SMP_CLIENT_URI=
ENV DRY=
ENV RETRY_COUNT=
ENV TOR_SOCKS5_PROXY=

CMD ./validator \
    --maxmind-db-path GeoLite2-Country.mmdb \
    --supabase-url $SUPABASE_URL \
    --supabase-key $SUPABASE_KEY \
    --smp-client-ws-url $SMP_CLIENT_URI \
    --retry-count $RETRY_COUNT \
    --tor-socks5-proxy $TOR_SOCKS5_PROXY \
    $( [ -n "$DRY" ] && echo "--dry" )
