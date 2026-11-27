import asyncio
import struct
import socket
import os

import dns.asyncresolver

TOR_HOST = os.environ.get("TOR_HOST", "tor")
TOR_PORT = int(os.environ.get("TOR_PORT", 9050))
I2P_HOST = os.environ.get("I2P_HOST", "i2pd")
I2P_PORT = int(os.environ.get("I2P_PORT", 4447))

# Alfis (https://github.com/Revertron/Alfis) zones. Names in them are not
# resolvable by clearnet resolvers (1.1.1.1 answers NXDOMAIN, and Docker's
# embedded DNS does not fall through to the next upstream on NXDOMAIN), so they
# are resolved explicitly through DNS servers reachable inside Yggdrasil.
YGG_ZONES = tuple(
    "." + z.strip(".").lower()
    for z in os.environ.get(
        "YGG_ZONES", "ygg anon btn conf index merch mirror mob screen srv"
    ).split()
)
YGG_DNS_SERVERS = os.environ.get(
    "YGG_DNS_SERVERS", "308:c8:48:45:: 324:71e:281a:9ed3::53 300:7c75:d590:c5d8::100"
).split()

ygg_resolver = dns.asyncresolver.Resolver(configure=False)
ygg_resolver.nameservers = YGG_DNS_SERVERS
ygg_resolver.lifetime = 10


def is_ygg_domain(host):
    return host.lower().rstrip(".").endswith(YGG_ZONES)


async def resolve_ygg(name):
    answer = await ygg_resolver.resolve(name, "AAAA")
    return [record.address for record in answer]


async def open_ygg_connection(host, port):
    last_error = None
    for addr in await resolve_ygg(host):
        try:
            return await asyncio.open_connection(addr, port)
        except OSError as e:
            last_error = e
    raise last_error

async def socks5_connect(host, port, proxy_host, proxy_port):
    reader, writer = await asyncio.open_connection(proxy_host, proxy_port)
    
    # SOCKS5 greeting
    writer.write(b"\x05\x01\x00")
    await writer.drain()
    version, auth_method = await reader.readexactly(2)
    if version != 5 or auth_method != 0:
        raise Exception("Invalid SOCKS5 greeting")
        
    # SOCKS5 connect request
    req = b"\x05\x01\x00\x03"
    req += bytes([len(host)]) + host.encode('utf-8')
    req += struct.pack("!H", port)
    writer.write(req)
    await writer.drain()
    
    # SOCKS5 connect reply
    reply = await reader.readexactly(4)
    if reply[0] != 5 or reply[1] != 0:
        raise Exception(f"SOCKS5 connect failed: {reply}")
        
    atyp = reply[3]
    if atyp == 1:
        await reader.readexactly(4)
    elif atyp == 3:
        domain_len = (await reader.readexactly(1))[0]
        await reader.readexactly(domain_len)
    elif atyp == 4:
        await reader.readexactly(16)
    await reader.readexactly(2)
    
    return reader, writer

async def handle_client(client_reader, client_writer):
    try:
        # 1. Greeting
        version, nmethods = await client_reader.readexactly(2)
        methods = await client_reader.readexactly(nmethods)
        
        if 0 in methods:
            client_writer.write(b"\x05\x00")
            await client_writer.drain()
        elif 2 in methods:
            client_writer.write(b"\x05\x02")
            await client_writer.drain()
            
            auth_version = await client_reader.readexactly(1)
            if auth_version != b"\x01":
                return
            ulen = (await client_reader.readexactly(1))[0]
            if ulen > 0:
                uname = await client_reader.readexactly(ulen)
            plen = (await client_reader.readexactly(1))[0]
            if plen > 0:
                passwd = await client_reader.readexactly(plen)
            
            # Auth success
            client_writer.write(b"\x01\x00")
            await client_writer.drain()
        else:
            client_writer.write(b"\x05\xFF")
            await client_writer.drain()
            return
        
        # 2. Request
        version, cmd, rsv, atyp = await client_reader.readexactly(4)
        if cmd != 1:  # Only CONNECT is supported
            client_writer.write(b"\x05\x07\x00\x01\x00\x00\x00\x00\x00\x00")
            await client_writer.drain()
            return

        if atyp == 1: # IPv4
            addr_bytes = await client_reader.readexactly(4)
            dst_addr = socket.inet_ntoa(addr_bytes)
        elif atyp == 3: # Domain name
            domain_len = (await client_reader.readexactly(1))[0]
            dst_addr = (await client_reader.readexactly(domain_len)).decode('utf-8')
        elif atyp == 4: # IPv6
            addr_bytes = await client_reader.readexactly(16)
            dst_addr = socket.inet_ntop(socket.AF_INET6, addr_bytes)
        else:
            client_writer.write(b"\x05\x08\x00\x01\x00\x00\x00\x00\x00\x00")
            await client_writer.drain()
            return
            
        dst_port_bytes = await client_reader.readexactly(2)
        dst_port = struct.unpack("!H", dst_port_bytes)[0]
        
        print(f"Connecting to {dst_addr}:{dst_port}")
        
        # Determine route
        try:
            if dst_addr.endswith(".onion"):
                remote_reader, remote_writer = await socks5_connect(dst_addr, dst_port, TOR_HOST, TOR_PORT)
            elif dst_addr.endswith(".i2p"):
                remote_reader, remote_writer = await socks5_connect(dst_addr, dst_port, I2P_HOST, I2P_PORT)
            elif is_ygg_domain(dst_addr):
                remote_reader, remote_writer = await open_ygg_connection(dst_addr, dst_port)
            else:
                remote_reader, remote_writer = await asyncio.open_connection(dst_addr, dst_port)
        except Exception as e:
            print(f"Failed to connect to {dst_addr}:{dst_port} - {e}")
            client_writer.write(b"\x05\x05\x00\x01\x00\x00\x00\x00\x00\x00")
            await client_writer.drain()
            return
            
        # Reply success
        client_writer.write(b"\x05\x00\x00\x01\x00\x00\x00\x00\x00\x00")
        await client_writer.drain()
        
        # Pipe data
        async def pipe(r, w):
            try:
                while True:
                    data = await r.read(8192)
                    if not data:
                        break
                    w.write(data)
                    await w.drain()
            except Exception:
                pass
            finally:
                w.close()
                
        await asyncio.gather(
            pipe(client_reader, remote_writer),
            pipe(remote_reader, client_writer)
        )
        
    except Exception as e:
        pass
    finally:
        try:
            client_writer.close()
        except:
            pass

async def main():
    server = await asyncio.start_server(handle_client, '0.0.0.0', 1080)
    print("Gateway SOCKS5 running on port 1080")
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())
