FROM --platform=linux/x86_64 ubuntu:22.04

RUN apt-get update && apt-get install -y netcat && rm -rf /var/lib/apt/lists/*

ADD --chmod=700 https://github.com/simplex-chat/simplex-chat/releases/download/v6.4.6/simplex-chat-ubuntu-22_04-x86_64 /simplex-chat

CMD sh -c "./simplex-chat --create-bot-display-name simplex-directory.asriyan.me -p 80 --socks-proxy $(getent hosts tor | awk '{ print $1 }'):9050 --socks-mode onion"
