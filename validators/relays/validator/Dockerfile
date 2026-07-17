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

COPY --from=builder /app/target/release/validate ./validate

ENV SUPABASE_URL=
ENV SUPABASE_KEY=
ENV SMP_CLIENT_URI=
ENV DRY=
ENV RETRY_COUNT=
ENV TOR_SOCKS5_PROXY=

CMD ./validate \
    --supabase-url $SUPABASE_URL \
    --supabase-key $SUPABASE_KEY \
    --smp-client-ws-url $SMP_CLIENT_URI \
    --retry-count $RETRY_COUNT \
    $( [ -n "$DRY" ] && echo "--dry" )
