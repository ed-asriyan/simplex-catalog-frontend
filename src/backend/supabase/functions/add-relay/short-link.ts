// Parser for SimpleX relay short links.
// Syntax (simplexmq protocol/agent-protocol.md, "Short connection link syntax"):
//   https://<host>/r#<linkKey>[?h=<host>[,<host>...]&p=<port>&c=<keyHash>]
// The query string lives inside the URL fragment, so it is not part of URL.search.

const LINK_KEY_LENGTH = 32;
const KEY_HASH_LENGTH = 32;

const RELAY_PATH_REGEX = /^\/r\/?$/i;
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+={0,2}$/;
const PORT_REGEX = /^\d{1,5}$/;
// Mirrors TransportHost parser in simplexmq: IPv6 (optionally in brackets) or any name without separators
const HOST_REGEX = /^(?:\[[\da-fA-F:]+\]|[\da-fA-F]*:[\da-fA-F:]+|[^:#,;/\s\[\]]+)$/;

export interface RelayShortLink {
  // SMP router hosts: URL hostname first, then hosts from `h` parameter
  hosts: string[];
  // `p` parameter; null means the router default port
  port: number | null;
  // `c` parameter, base64url router certificate fingerprint; null when omitted
  keyHash: string | null;
  // base64url key decrypting the link data; never sent to the router
  linkKey: string;
}

export enum ShortLinkError {
  InvalidProtocol,
  NotRelayAddress,
  InvalidContactData,
}

export type ShortLinkParseResult =
  | { link: RelayShortLink; error?: undefined }
  | { link?: undefined; error: ShortLinkError };

const decodeBase64Url = function (input: string): Uint8Array | null {
  if (!BASE64URL_REGEX.test(input)) {
    return null;
  }

  // Replace Base64URL chars with standard Base64 chars
  let base64 = input.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');

  // Pad with '=' to make length a multiple of 4
  while (base64.length % 4) {
    base64 += '=';
  }

  try {
    const binString = atob(base64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
};

const isBase64UrlOfLength = (input: string, length: number): boolean =>
  decodeBase64Url(input)?.length === length;

export const parseRelayShortLink = function (url: URL): ShortLinkParseResult {
  if (url.protocol !== 'https:') {
    return { error: ShortLinkError.InvalidProtocol };
  }

  if (!RELAY_PATH_REGEX.test(url.pathname)) {
    return { error: ShortLinkError.NotRelayAddress };
  }

  // Router port is passed in `p` parameter, simplexmq does not accept it in the authority
  if (url.port || url.search) {
    return { error: ShortLinkError.InvalidContactData };
  }

  const fragment = url.hash.slice(1);
  const queryStart = fragment.indexOf('?');
  const linkKey = queryStart === -1 ? fragment : fragment.slice(0, queryStart);
  const params = new URLSearchParams(queryStart === -1 ? '' : fragment.slice(queryStart + 1));

  if (!isBase64UrlOfLength(linkKey, LINK_KEY_LENGTH)) {
    return { error: ShortLinkError.InvalidContactData };
  }

  const hosts = [url.hostname];
  const hostsParam = params.get('h');
  if (hostsParam) {
    const extraHosts = hostsParam.split(',');
    if (!extraHosts.every((host) => HOST_REGEX.test(host))) {
      return { error: ShortLinkError.InvalidContactData };
    }
    hosts.push(...extraHosts);
  }

  let port: number | null = null;
  const portParam = params.get('p');
  if (portParam !== null) {
    port = Number(portParam);
    if (!PORT_REGEX.test(portParam) || port > 65535) {
      return { error: ShortLinkError.InvalidContactData };
    }
  }

  const keyHash = params.get('c');
  if (keyHash !== null && !isBase64UrlOfLength(keyHash, KEY_HASH_LENGTH)) {
    return { error: ShortLinkError.InvalidContactData };
  }

  return { link: { hosts, port, keyHash, linkKey } };
};
