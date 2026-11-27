FROM alpine:3.24

# Tor >= 0.4.9.5 is required: since the 2026-10-28 consensus the directory
# authorities require Desc=3/Microdesc=3, and older clients exit on startup.
RUN apk add --no-cache tor curl

COPY torrc /etc/tor/torrc

USER tor

EXPOSE 9050

CMD ["tor", "-f", "/etc/tor/torrc"]
