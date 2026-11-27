// The values the functions' ports exchange.

/**
 * What a port gives when what it does can fail: `ok` and the value, or not `ok` and the message of why. A port
 * never throws and its promise never rejects: a failure is this, and nothing else.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * How a function answers, before it is put on the wire: an HTTP status and, but for 204, a JSON body; the
 * website shows `error` to the visitor as it is (US-B47, US-C20, US-D20). The logic always gives one,
 * whatever failed: it never throws or rejects.
 */
export type Answer =
  | { http: 204 }
  | { http: 400 | 405 | 500; body: { status?: number; error: string } };

/** The protocol of a server as the database keeps it: 1 SMP, 2 XFTP. */
export type Protocol = 1 | 2;
