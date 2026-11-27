import { start } from './harness/stack';
import { build, down, VALIDATORS } from './harness/validators';

export default async function globalSetup() {
  // The validators are on the stack's network: they go first, so a new stack can replace it.
  for (const v of VALIDATORS) await down(v);
  start();
  if (!process.env.E2E_SKIP_BUILD) for (const v of VALIDATORS) await build(v);
}
