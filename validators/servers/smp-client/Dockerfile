FROM --platform=linux/x86_64 ubuntu:22.04

ADD --chmod=700 https://github.com/simplex-chat/simplex-chat/releases/download/v6.0.4/simplex-chat-ubuntu-22_04-x86-64 /simplex-chat

CMD sh -c "echo a | ./simplex-chat -p 80 --socks-proxy $(getent hosts tor | awk '{ print $1 }'):9050 --socks-mode onion"
