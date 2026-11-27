// The whole catalog, run locally, as the tests find it: the backend on a local
// Supabase (started by the Supabase CLI, from src/backend, with its migrations
// and seed), and e2e/docker-compose.yml beside it — the servers the tests add,
// the bots' SimpleX CLI, the website and the browser. It is brought up once per
// run by global-setup.ts, from an empty database, left running afterwards for
// a look at its logs, and replaced at the start of the next run.
//
// The local Supabase is the one `npx supabase start` in src/backend gives a
// developer: a run replaces its data.
//
// Environment:
// - `E2E_SKIP_BUILD=1` uses the images already built instead of building them;
// - `E2E_COMPOSE_FILES` adds compose files of this machine's own, separated by
//   `:` (a machine whose kernel has no IPv6 needs one for the SMP server);
// - `E2E_DEBUG=1` prints every event the bots' CLI hands the tests.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { forgetFixtures } from './fixture';

export const ROOT = path.resolve(__dirname, '..', '..');
const E2E = path.join(ROOT, 'e2e');
const BACKEND = path.join(ROOT, 'src', 'backend');
/** The website, as the browser opens it. */
export const WEBSITE = 'http://127.0.0.1:18081';
/** The bots' SimpleX CLI. */
export const BOTS_WS = 'ws://127.0.0.1:15226';
/** The browser of the tests, in Docker (`browser` in e2e/docker-compose.yml). */
export const BROWSER = 'ws://127.0.0.1:13000/';
/** The Supabase project of src/backend/supabase/config.toml. */
export const SUPABASE_PROJECT = 'simplex-catalog';
const STATE_FILE = path.join(os.tmpdir(), 'simplex-catalog-e2e.json');
/** The hosts of the stack's servers the tests have taken (harness/hosts.ts); a new stack has none taken. */
export const TAKEN_FILE = path.join(os.tmpdir(), 'simplex-catalog-e2e-taken.json');

// The browser's image is the Playwright the tests run, so the two always agree.
const PLAYWRIGHT = { E2E_PLAYWRIGHT_VERSION: require('@playwright/test/package.json').version as string };

/** What the stack is once started, for the tests. */
export interface State {
  /** The local Supabase as the browser and the tests reach it. */
  supabaseUrl: string;
  /** Its public key, the website's, and its service key, the validators'. */
  publicKey: string;
  serviceKey: string;
  /** The SMP and XFTP servers of the stack, as their addresses read. */
  smpServer: string;
  xftpServer: string;
  /** The address of the stack's chat relay. */
  relay: string;
}

function files(): string[] {
  const extra = (process.env.E2E_COMPOSE_FILES || '').split(':').filter(Boolean);
  return [path.join(E2E, 'docker-compose.yml'), ...extra].flatMap((f) => ['-f', f]);
}

function run(cmd: string, args: string[], cwd: string, env: Record<string, string> = {}): string {
  return execFileSync(cmd, args, {
    cwd,
    env: { ...process.env, ...PLAYWRIGHT, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function compose(args: string[], env: Record<string, string> = {}): string {
  return run('docker', ['compose', ...files(), ...args], ROOT, env);
}

function supabase(args: string[]): string {
  return run(path.join(E2E, 'node_modules', '.bin', 'supabase'), args, BACKEND);
}

function waitForLog(service: string, pattern: RegExp): string {
  const deadline = Date.now() + 120_000;
  for (;;) {
    const found = compose(['logs', '--no-log-prefix', service]).match(pattern);
    if (found) return found[1];
    if (Date.now() > deadline) throw new Error(`${service} did not log ${pattern} in time`);
    execFileSync('sleep', ['1']);
  }
}

/** The services of the local Supabase the catalog does not use. */
const UNUSED = ['studio', 'imgproxy', 'inbucket', 'logflare', 'vector', 'supavisor', 'postgres-meta'];

/** Starts the stack from an empty database; returns what the tests need of it. */
export function start(): State {
  fs.rmSync(TAKEN_FILE, { force: true });
  forgetFixtures();
  compose(['down', '-v', '--remove-orphans']);
  supabase(['stop', '--no-backup']);
  supabase(['start', '-x', UNUSED.join(',')]);
  const status = JSON.parse(supabase(['status', '-o', 'json']));
  compose(['up', '-d', 'smp-server', 'xftp-server']);
  const smpServer = waitForLog('smp-server', /Server address: (smp:\/\/\S+)/);
  const xftpServer = waitForLog('xftp-server', /Server address: (xftp:\/\/\S+)/);
  const env = { E2E_SMP_SERVER: smpServer, E2E_SUPABASE_URL: status.API_URL, E2E_SUPABASE_KEY: status.ANON_KEY };
  if (!process.env.E2E_SKIP_BUILD) compose(['build'], env);
  compose(['up', '-d', '--no-build'], env);
  waitForLog('browser', /(Listening on) /);
  // Once started, the relay asks on its terminal whether to make its address
  // (the question has no line end, so the log shows it only with the answer).
  waitForLog('relay', /(Current user: relay)/);
  compose(['exec', '-T', 'relay', 'sh', '-c', 'echo y > /commands']);
  const relay = waitForLog('relay', /Chat relay address is created:\s+(https:\/\/\S+)/);
  const state: State = {
    supabaseUrl: status.API_URL,
    publicKey: status.ANON_KEY,
    serviceKey: status.SERVICE_ROLE_KEY,
    smpServer,
    xftpServer,
    relay,
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  return state;
}

/**
 * The stack's relay deletes its address, as its owner does when it takes the relay
 * down for good: whoever checks the relay from now on finds nobody at it. (A relay
 * whose process is stopped is not found gone: its address is kept by the SMP server.)
 */
export function deleteRelayAddress() {
  compose(['exec', '-T', 'relay', 'sh', '-c', 'echo /da > /commands']);
}

/** The stack started by this run. */
export function stack(): State {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}
