// What the logic of `add-bot` and `add-relay` share of reading a request: the field of a body, a URL that may
// not parse, and the answers of an address refused. The texts are the ones the website shows the visitor as they
// are (US-C20, US-D20), so they are written once.

import type { Answer } from '../ports/types.ts';

/** Hosts that are never added: a catalog on the internet cannot check them. */
const BANNED_HOSTNAMES = ['localhost'];

/**
 * The field of a request's JSON, of any shape: a body that is not an object has none. A value that is not
 * text is returned as it is, for the caller to refuse.
 */
export const fieldOf = (body: unknown, name: string): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[name] : undefined;

/** The URL of the text, or null when the text is none. */
export const parseUrl = (text: string): URL | null => {
  try {
    return new URL(text);
  } catch {
    return null;
  }
};

/** Whether the host is one that is never added. */
export const isBannedHost = (host: string): boolean => BANNED_HOSTNAMES.includes(host.toLowerCase());

const refused = (status: number, error: string): Answer => ({ http: 400, body: { status, error } });

/** The request has no `field`. */
export const missing = (field: string): Answer => ({ http: 400, body: { error: `Missing ${field}` } });
/** 1: not a URL. */
export const notAUrl = (): Answer => refused(1, 'Invalid URL format');
/** 2: not HTTPS. */
export const notHttps = (): Answer => refused(2, 'URL has invalid format. Schema must be HTTPS');
/** 4: a host that is never added. */
export const hostNotAllowed = (): Answer => refused(4, 'Hostname is not allowed');
/** 6: the address of its kind, but what it carries cannot be read. */
export const invalidContactData = (): Answer => refused(6, 'URL has invalid format. Invalid contact data.');
/** 3: an address of another kind. */
export const notOfKind = (kind: 'bot' | 'relay'): Answer => refused(3, `URL is not a ${kind} address`);

/** 500 with status 3 and the store's message, when the address could not be stored. */
export const notStored = (error: string): Answer => ({ http: 500, body: { status: 3, error } });
