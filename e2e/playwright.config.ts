// The stories, played against the whole catalog run locally. The tests share
// its database, its servers and its bots' CLI, so they run one at a time.
//
// The browser runs in Docker (`browser` in e2e/docker-compose.yml), so a page
// renders the same wherever the tests run, and a screenshot compares with the
// one approved under tests/__screenshots__/. Nothing is taken unless asked:
// a screenshot with nothing approved yet fails the test, and only the
// finalize stage takes one (AGENTS.md, *Workflow*).
import { defineConfig } from '@playwright/test';
import { BROWSER } from './harness/stack';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 300_000,
  reporter: [['list']],
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFileName}/{arg}{ext}',
  updateSnapshots: 'none',
  expect: {
    timeout: 15_000,
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: {
    trace: 'retain-on-failure',
    // The browser goes out through the tests' machine: to its localhost, where
    // the website and Supabase are, and to what the website loads.
    connectOptions: { wsEndpoint: BROWSER, exposeNetwork: '*' },
  },
  projects: [
    { name: 'computer', use: { viewport: { width: 1280, height: 800 } } },
    // The pages of the catalog are those of a computer; what a phone shows differently is the navigation's.
    {
      name: 'phone',
      testMatch: /navigation\.spec\.ts/,
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    },
  ],
});
