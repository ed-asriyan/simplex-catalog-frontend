// What the catalog's maintainer does outside the website, in the Supabase
// project: approving a bot someone added, so the bots validator checks it and
// the website lists it. The tests do it as the maintainer does, on the
// database, with the project's secret key.
import { stack } from './stack';

async function rest(method: string, path: string, body?: unknown): Promise<unknown> {
  const s = stack();
  const request = () =>
    fetch(`${s.supabaseUrl}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: s.serviceKey,
        Authorization: `Bearer ${s.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  // A connection kept from an earlier request may have been closed by Supabase
  // meanwhile (a validator's run takes longer than it keeps one open): once.
  const r = await request().catch(() => request());
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

/** Approves the bot added with `address`. */
export async function approveBot(address: string) {
  const rows = (await rest('PATCH', `bots?address=eq.${encodeURIComponent(address)}`, { approved: true })) as unknown[];
  if (rows.length !== 1) throw new Error(`no bot added with the address ${address}`);
}

/** The bot added with `address`, as the maintainer sees it in the Supabase project; none if nobody added it. */
export async function addedBot(address: string): Promise<{ id: string; approved: boolean | null } | undefined> {
  const rows = (await rest('GET', `bots?select=uuid,approved&address=eq.${encodeURIComponent(address)}`)) as { uuid: string; approved: boolean | null }[];
  return rows[0] && { id: rows[0].uuid, approved: rows[0].approved };
}

/** Whether a relay was added with `url`. */
export async function relayAdded(url: string): Promise<boolean> {
  const rows = (await rest('GET', `relays?select=uuid&url=eq.${encodeURIComponent(url)}`)) as unknown[];
  return rows.length > 0;
}

/** Whether a server with `host` was added. */
export async function serverAdded(host: string): Promise<boolean> {
  const rows = (await rest('GET', `server_hosts?select=uuid&host=eq.${encodeURIComponent(host)}`)) as unknown[];
  return rows.length > 0;
}

/**
 * Puts a bot in the Supabase project as the website's *Add bot anonymously* would
 * have, for an address the website refuses (US-C18): a short link of a bot on a
 * server of its own, which the stack's bots all have. Not approved.
 */
export async function submitBot(address: string) {
  await rest('POST', 'bots', { address });
}
