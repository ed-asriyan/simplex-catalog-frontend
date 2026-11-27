// The bots of the tests: each a user profile of the stack's bots CLI (`bots` in
// e2e/docker-compose.yml), with a bot's profile — its name, its description,
// its commands — and an address that accepts whoever connects, whom the bot
// then greets, as a bot built on SimpleX does: the address's own auto-reply is
// not sent by this CLI. The bots validator finds out about a bot through its
// address, as it does in production: what the address's link shows, and what
// the bot says first.
//
// The CLI hands each event to one of its websocket clients only, so the bots
// share a single connection.
import fs from 'node:fs';
import { Cli, Event, Queue } from './cli';
import { BOTS_WS, TAKEN_FILE } from './stack';

let cli: Cli | undefined;
/**
 * The token of the run's next bot, `x001` on: the same every run, so a page shows the same names, and kept with what
 * the stack has taken, so a worker started again goes on from it.
 */
function nextToken(): string {
  let taken: Record<string, number> = {};
  try {
    taken = JSON.parse(fs.readFileSync(TAKEN_FILE, 'utf8'));
  } catch {
    // nothing taken yet in this run
  }
  const n = (taken.bot ?? 0) + 1;
  fs.writeFileSync(TAKEN_FILE, JSON.stringify({ ...taken, bot: n }));
  return `x${String(n).padStart(3, '0')}`;
}

async function shared(): Promise<Cli> {
  cli ??= await Cli.connect(BOTS_WS);
  return cli;
}

/** A command a bot offers, as its profile lists it. */
export interface Command {
  keyword: string;
  label: string;
}

export interface BotProfile {
  /** The display name; a token is added to make it unique, where `{}` is, or at its end. */
  name: string;
  description?: string;
  /** The profile's image, as a data URI. */
  image?: string;
  commands?: Command[];
  /** What it says to whoever connects to its address; nothing when absent. */
  greeting?: string;
}

/** What of a bot is kept for the rest of a run (harness/fixture.ts). */
export interface SavedBot {
  name: string;
  userId: number;
  address: string;
  greeting?: string;
}

export class Bot {
  private constructor(
    private cli: Cli,
    readonly name: string,
    readonly userId: number,
    /** Its address, as a person shares it: the short link. */
    readonly address: string,
    private events: Queue,
    private greeting?: string,
  ) {}

  toJSON(): SavedBot {
    return { name: this.name, userId: this.userId, address: this.address, greeting: this.greeting };
  }

  /** A bot made earlier in the run, answering whoever connects again. */
  static async revive(saved: SavedBot): Promise<Bot> {
    const c = await shared();
    const bot = new Bot(c, saved.name, saved.userId, saved.address, c.listen(saved.userId), saved.greeting);
    void bot.answer(saved.greeting);
    return bot;
  }

  /** A new bot with its address, answering whoever connects to it. */
  static async create(profile: BotProfile): Promise<Bot> {
    const c = await shared();
    const token = nextToken();
    const name = profile.name.includes('{}') ? profile.name.replace('{}', token) : `${profile.name}${token}`;
    // The CLI's /create user takes one word; the profile then gets the whole name.
    const created = await c.command(`/create user bot${token}`);
    if (created.type !== 'activeUser') throw new Error(`create ${name}: ${JSON.stringify(created)}`);
    const userId: number = created.user.userId;
    const events = c.listen(userId);
    const full = {
      displayName: name,
      fullName: '',
      ...(profile.description ? { shortDescr: profile.description } : {}),
      ...(profile.image ? { image: profile.image } : {}),
      peerType: 'bot',
      preferences: { commands: (profile.commands ?? []).map((c) => ({ type: 'command', ...c })) },
    };
    await expect(c.commandAs(userId, `/_profile ${userId} ${JSON.stringify(full)}`), 'userProfileUpdated', name);
    const address = await expect(c.commandAs(userId, `/_address ${userId}`), 'userContactLinkCreated', name);
    await expect(
      c.commandAs(userId, `/_address_settings ${userId} ${JSON.stringify({ businessAddress: false, autoAccept: { acceptIncognito: false } })}`),
      'userContactLinkUpdated',
      name,
    );
    const bot = new Bot(c, name, userId, address.connLinkContact.connShortLink, events, profile.greeting);
    void bot.answer(profile.greeting);
    return bot;
  }

  /** Greets whoever connects, for as long as the run lasts. */
  private async answer(greeting: string | undefined) {
    for (;;) {
      const e = await this.events.next(3_600_000);
      if (e?.type !== 'contactConnected' || !greeting) continue;
      const msg = [{ msgContent: { type: 'text', text: greeting } }];
      const sent = await this.cli.commandAs(this.userId, `/_send @${e.contact.contactId} json ${JSON.stringify(msg)}`);
      if (process.env.E2E_DEBUG) console.log('[bot]', this.name, 'greets', e.contact.contactId, sent.type);
    }
  }

  /** Deletes its address: whoever looks for it from now on finds nothing. */
  async deleteAddress() {
    await expect(this.cli.commandAs(this.userId, `/_delete_address ${this.userId}`), 'userContactLinkDeleted', this.name);
  }

  /**
   * Stops accepting whoever connects: its address stays, and a request to it goes
   * unanswered, as when a bot's program is down.
   */
  async goOffline() {
    await expect(
      this.cli.commandAs(this.userId, `/_address_settings ${this.userId} ${JSON.stringify({ businessAddress: false })}`),
      'userContactLinkUpdated',
      this.name,
    );
  }
}

async function expect(response: Promise<Event>, type: string, name: string): Promise<Event> {
  const r = await response;
  if (r.type !== type) throw new Error(`${name}: expected ${type}, got ${JSON.stringify(r).slice(0, 500)}`);
  return r;
}
