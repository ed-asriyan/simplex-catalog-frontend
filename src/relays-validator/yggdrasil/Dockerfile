FROM debian:bookworm-slim

# https://yggdrasil-network.github.io/installation-linux-deb.html
RUN apt update && apt install -y gnupg dirmngr curl && \
    mkdir -p /usr/local/apt-keys && \
    gpg --fetch-keys https://neilalexander.s3.dualstack.eu-west-2.amazonaws.com/deb/key.txt && \
    (gpg --export 1C5162E133015D81A811239D1840CDAC6011C5EA | tee /usr/local/apt-keys/yggdrasil-keyring.gpg > /dev/null) && \
    (echo 'deb [signed-by=/usr/local/apt-keys/yggdrasil-keyring.gpg] http://neilalexander.s3.dualstack.eu-west-2.amazonaws.com/deb/ debian yggdrasil' | tee /etc/apt/sources.list.d/yggdrasil.list) && \
    apt-get update && apt-get install -y --no-install-recommends yggdrasil && \
    rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
