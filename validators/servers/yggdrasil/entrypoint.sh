#!/bin/sh
set -e

mkdir -p /var/run/yggdrasil

if [ ! -f /etc/yggdrasil.conf ]; then
    yggdrasil -genconf > /etc/yggdrasil.conf
fi

if [ -n "$YGGDRASIL_PEERS" ]; then
    PEERS_JSON=$(echo "$YGGDRASIL_PEERS" | tr ' ' '\n' | awk '{printf "\"%s\", ", $0}' | sed 's/, $//')
    sed -i "s|  Peers: \[\]|  Peers: [$PEERS_JSON]|" /etc/yggdrasil.conf
fi

exec yggdrasil -useconffile /etc/yggdrasil.conf
