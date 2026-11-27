#!/usr/bin/env python3
"""Writes GeoLite2-Country.mmdb, the GeoIP database the servers validator uses in the end-to-end stack.

The stack's servers are on private addresses, which the real database knows no country of, and a server
the validator cannot find a country of leaves no status at all. The addresses of the stack's own
network (10.99.0.0/16, e2e/docker-compose.yml) are given countries here instead:

    10.99.1.0/24 Germany    10.99.2.0/24 Japan    10.99.3.0/24 Brazil    10.99.9.0/24 Netherlands

Needs `pip install mmdb-writer netaddr`. Run from this directory: python3 make.py
"""
from mmdb_writer import MMDBWriter
from netaddr import IPSet

COUNTRIES = {
    "10.99.1.0/24": "DE",
    "10.99.2.0/24": "JP",
    "10.99.3.0/24": "BR",
    "10.99.9.0/24": "NL",
}

writer = MMDBWriter(
    ip_version=4,
    database_type="GeoLite2-Country",
    languages=["en"],
    description={"en": "The countries of the end-to-end stack's addresses"},
)
for network, code in COUNTRIES.items():
    writer.insert_network(IPSet([network]), {"country": {"iso_code": code}})
writer.to_db_file("../GeoLite2-Country.mmdb")
