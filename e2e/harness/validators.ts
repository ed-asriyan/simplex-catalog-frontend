// The validators, run as production runs them on their schedule — once, over
// everything in the catalog — but when a test says so: by their own compose
// files (src/<name>-validator/docker-compose.yml), overridden for the stack by
// e2e/validators/<name>.yml. A run returns when the validator has finished;
// what it found is then in the database, for the website to show.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT, stack } from './stack';

export type Validator = 'servers' | 'relays' | 'bots';
export const VALIDATORS: Validator[] = ['servers', 'relays', 'bots'];

/**
 * Runs docker compose for the validator `name`; resolves with its output. It
 * does not block: the tests' bots answer the validator while it runs.
 */
function compose(name: Validator, args: string[], running = false): Promise<string> {
  // Only a run needs the stack: what it checks, and the key it writes with.
  const s = running ? stack() : { smpServer: '', serviceKey: '' };
  const child = spawn(
    'docker',
    [
      'compose',
      '-p', `simplex-catalog-e2e-${name}-validator`,
      '-f', path.join(ROOT, 'src', `${name}-validator`, 'docker-compose.yml'),
      '-f', path.join(ROOT, 'e2e', 'validators', `${name}.yml`),
      ...args,
    ],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        E2E_SMP_SERVER: s.smpServer,
        E2E_SUPABASE_KEY: s.serviceKey,
        E2E_GEOIP_DB: path.join(ROOT, 'e2e', 'validators', 'GeoLite2-Country.mmdb'),
      },
    },
  );
  // The validators log to stderr.
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(log) : reject(new Error(`${name} validator: docker compose ${args.join(' ')} failed:\n${log}`)),
    );
  });
}

/** Builds a validator's images. */
export async function build(name: Validator) {
  await compose(name, ['build']);
}

/** Stops a validator and forgets what its CLI knew; it also lets go of the stack's network, which a new stack replaces. */
export async function down(name: Validator) {
  await compose(name, ['down', '-v', '--remove-orphans']);
}

/** Runs the validator `name` once, over the whole catalog; resolves with its log. */
export function validate(name: Validator): Promise<string> {
  return compose(name, ['run', '--rm', 'validator'], true);
}
