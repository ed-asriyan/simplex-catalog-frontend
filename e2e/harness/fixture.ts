// What a spec sets up once for its tests (servers added and checked, bots made,
// approved and checked) and keeps for the rest of the run. Playwright starts a
// new worker after a test fails, and runs the spec's beforeAll in it again:
// the setup is then taken from what the first one left, not made twice, as
// making it takes minutes. A new stack (harness/stack.ts) forgets it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PREFIX = 'simplex-catalog-e2e-fixture-';

/** The file of the fixture `name`. */
const fileOf = (name: string) => path.join(os.tmpdir(), `${PREFIX}${name}.json`);

/** Forgets every fixture: a new stack has none. */
export function forgetFixtures() {
  for (const f of fs.readdirSync(os.tmpdir())) if (f.startsWith(PREFIX)) fs.rmSync(path.join(os.tmpdir(), f), { force: true });
}

/**
 * The fixture `name`: what `create` made in the first call of the run, or what
 * `revive` makes of it in the later ones. `create` returns what `save` keeps.
 */
export async function once<T, S>(
  name: string,
  create: () => Promise<{ value: T; save: S }>,
  revive: (save: S) => Promise<T> | T,
): Promise<T> {
  const file = fileOf(name);
  if (fs.existsSync(file)) return revive(JSON.parse(fs.readFileSync(file, 'utf8')) as S);
  const { value, save } = await create();
  fs.writeFileSync(file, JSON.stringify(save));
  return value;
}
