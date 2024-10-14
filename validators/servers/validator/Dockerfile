FROM rust:1.81-alpine as builder

# https://github.com/rust-lang/docker-rust/issues/167#issuecomment-1969549237
RUN apk add --no-cache pkgconfig libc-dev openssl-dev openssl-libs-static

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src src

RUN cargo build --release


FROM alpine:latest as validate

WORKDIR /app

ADD https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb ./GeoLite2-Country.mmdb
COPY --from=builder /app/target/release/validate ./validate

ENV SUPABASE_URL=
ENV SUPABASE_KEY=
ENV SMP_CLIENT_URI=
ENV SUPABASE_SERVERS_TABLE_NAME=
ENV SUPABASE_SERVERS_STATUS_TABLE_NAME=

CMD sleep 3 && ./validate \
    --maxmind-db-path GeoLite2-Country.mmdb \
    --supabase-url $SUPABASE_URL \
    --supabase-key $SUPABASE_KEY \
    --smp-client-ws-url $SMP_CLIENT_URI \
    --supabase-servers-table-name $SUPABASE_SERVERS_TABLE_NAME \
    --supabase-servers-status-table-name $SUPABASE_SERVERS_STATUS_TABLE_NAME
