// The logic of the `add-relay` function: it turns the body of a request into the answer, over the relay store
// (US-D17…US-D21). A relay is stored by the address as given; one already stored is the store's error, which the
// visitor reads as it is.
//
// The address is read as a short link first (`short-link.ts`), so its path, its authority and its fragment are
// refused before its hosts are: `localhost` among the hosts is refused only for an address that is otherwise a
// relay's.

import type { AddRelay } from '../ports/inbound.ts';
import type { RelayStore } from '../ports/outbound.ts';
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
import { parseRelayShortLink, ShortLinkError } from './short-link.ts';

/** The answer that refuses the URL, or null when it is a relay's. */
const refusalOf = (url: URL): Answer | null => {
  const { link, error } = parseRelayShortLink(url);
  if (!link) {
    switch (error) {
      case ShortLinkError.InvalidProtocol:
        return notHttps();
      case ShortLinkError.NotRelayAddress:
        return notOfKind('relay');
      default:
        return invalidContactData();
    }
  }
  return link.hosts.some(isBannedHost) ? hostNotAllowed() : null;
};

export class AddRelayLogic implements AddRelay {
  constructor(private readonly store: RelayStore) {}

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
