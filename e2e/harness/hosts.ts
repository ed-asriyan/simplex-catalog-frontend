// The addresses the tests add to the catalog as servers. The stack has one SMP
// server and one XFTP server, and reaches them by many names: the forwarders of
// e2e/docker-compose.yml, one per country, each under names of its own. A
// catalog server is a host with an identity, so a test takes a name no other
// test has, and gets a server of its own that answers when the validator checks
// it, and is in a country (the stack's GeoIP database says which).
//
// A server whose host has no country leaves no check at all: it stays unknown.
// That is a server on a name nobody has (`unknownServer`). A server on Tor, I2P
// or Yggdrasil has the country of its network, and the stack has no way into
// any of them, so it is offline.
import fs from 'node:fs';
import { stack, TAKEN_FILE } from './stack';

export type Country = 'DE' | 'JP' | 'BR';

/** The names of each kind the stack has (e2e/docker-compose.yml). */
const NAMES: Record<string, number> = { de: 16, jp: 8, br: 8, down: 16 };

function taken(): Record<string, number> {
  try {
    return JSON.parse(fs.readFileSync(TAKEN_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/** The next name of `kind` no test has taken. */
function nextName(kind: string): string {
  const t = taken();
  const n = (t[kind] ?? 0) + 1;
  if (n > NAMES[kind]) throw new Error(`the stack has no more names of ${kind}: ${NAMES[kind]} are taken`);
  fs.writeFileSync(TAKEN_FILE, JSON.stringify({ ...t, [kind]: n }));
  return `${kind}${String(n).padStart(2, '0')}.e2e.test`;
}

let counter = 0;
/** A short token, different on every call and every run. */
export function token(): string {
  return `${(Date.now() % 1e8).toString(36)}${(++counter).toString(36)}`;
}

function identity(of: 'smp' | 'xftp'): string {
  const uri = of === 'smp' ? stack().smpServer : stack().xftpServer;
  return uri.slice(uri.indexOf('//') + 2, uri.indexOf('@'));
}

/** The identity of the stack's SMP server, which every `smpServer()` shares. */
export const smpIdentity = () => identity('smp');

export interface Address {
  /** The whole address, as the website's *Add server anonymously* takes it. */
  uri: string;
  host: string;
  identity: string;
}

function address(protocol: 'smp' | 'xftp', host: string): Address {
  const id = identity(protocol);
  return { uri: `${protocol}://${id}@${host}`, host, identity: id };
}

/** An SMP server of its own that answers, in `country`: the stack's, under a name no one else has. */
export const smpServer = (country: Country = 'DE'): Address => address('smp', nextName(country.toLowerCase()));
/** An XFTP server of its own that answers, in `country`. */
export const xftpServer = (country: Country = 'DE'): Address => address('xftp', nextName(country.toLowerCase()));
/** An SMP server of its own that is found, in the Netherlands, and does not answer: offline. */
export const downServer = (): Address => address('smp', nextName('down'));
/** An SMP server on a name nobody has: no country, so no check of it ever leaves a trace, and it stays unknown. */
export const unknownServer = (): Address => address('smp', `unknown-${token()}.nowhere.test`);
/** An SMP server on Tor, I2P or Yggdrasil: offline, at the location of its network. */
export const onionServer = (): Address => address('smp', `${token().padEnd(16, 'a').replace(/[^a-z2-7]/g, 'b')}.onion`);
export const i2pServer = (): Address => address('smp', `${token()}.b32.i2p`);
export const yggServer = (): Address => address('smp', `${token()}.ygg`);
/** An SMP server whose identity is not the one the stack's server has: found, and offline. */
export const strangerServer = (country: Country = 'JP'): Address => {
  const host = nextName(country.toLowerCase());
  const id = Buffer.from(`${token()}-stranger`.padEnd(32, 'x')).toString('base64url');
  return { uri: `smp://${id}@${host}`, host, identity: id };
};
