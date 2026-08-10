import asyncio
import struct
import socket
import os

TOR_HOST = os.environ.get("TOR_HOST", "tor")
TOR_PORT = int(os.environ.get("TOR_PORT", 9050))
I2P_HOST = os.environ.get("I2P_HOST", "i2pd")
I2P_PORT = int(os.environ.get("I2P_PORT", 4447))

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
