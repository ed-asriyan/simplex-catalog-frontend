// The logic of the `add-bot` function: it turns the body of a request into the answer, over the bot store
// (US-C16…US-C21). A bot is stored by the address as given, not approved; one already stored is the store's
// error, which the visitor reads as it is.
//
// A bot's address is a short link (`/a#<32-byte key>`) or a full address (`/contact`, with the bot's SMP server in
// the fragment's `smp`). A group's link is the same full address with a `groupLinkId` in its `data`, and is not a
// bot's. The host is checked before the path, so `localhost` is refused whatever it points to.

import type { AddBot } from '../ports/inbound.ts';
import type { BotStore } from '../ports/outbound.ts';
import type { Answer } from '../ports/types.ts';
import {
  fieldOf,
  hostNotAllowed,
  invalidContactData,
  isBannedHost,
  missing,
  notAUrl,
  notHttps,
  notOfKind,
  notStored,
  parseUrl,
} from './address.ts';

const INVITATION_CODE_LENGTH = 32;

/** The bytes of a base64url text, or null when it is not one. */
const decodeBase64Url = (input: string): Uint8Array | null => {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  try {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
};

const parseJson = (input: string): unknown => {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};

const isGroupLink = (data: string): boolean =>
  typeof (parseJson(data) as { groupLinkId?: unknown } | null)?.groupLinkId === 'string';

/** The answer that refuses the URL, or null when it is a bot's. */
const refusalOf = (url: URL): Answer | null => {
  if (url.protocol !== 'https:') return notHttps();
  if (isBannedHost(url.hostname)) return hostNotAllowed();

  if (url.pathname === '/a') {
    return decodeBase64Url(url.hash.slice(1))?.length === INVITATION_CODE_LENGTH ? null : invalidContactData();
  }
  if (url.pathname === '/contact') {
    const params = new URLSearchParams(url.hash.slice(2));
    const data = params.get('data');
    if (data && isGroupLink(data)) return notOfKind('bot');
    const smp = params.get('smp');
    if (!smp) return invalidContactData();
    return parseUrl(smp)?.protocol === 'smp:' ? null : invalidContactData();
  }
  return notOfKind('bot');
};

export class AddBotLogic implements AddBot {
  constructor(private readonly store: BotStore) {}

  async add(body: unknown): Promise<Answer> {
    const address = fieldOf(body, 'url');
    if (!address) return missing('url');
    const url = typeof address === 'string' ? parseUrl(address) : null;
    if (!url) return notAUrl();

    const refusal = refusalOf(url);
    if (refusal) return refusal;

    const stored = await this.store.insert(address as string);
    return stored.ok ? { http: 204 } : notStored(stored.error);
  }
}
