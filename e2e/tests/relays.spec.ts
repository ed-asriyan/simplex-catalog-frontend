// Epic D: the relays — their page and table, filters, sorting and pages, a
// relay's page, adding a relay, and what the checks show.
//
// The stack has one chat relay. The catalog is given it under three addresses
// — as it is, and with a name of the stack's server it can also be reached by
// (`?h=…`) — which the catalog lists as three relays that answer alike, and a
// fourth address nobody answers at. Added on the website and checked by the
// relays validator, the tests share them. The relay deletes its address at the
// end, for the test of what the next check finds.
import { randomBytes } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { once } from '../harness/fixture';
import { relayAdded } from '../harness/maintainer';
import { add, allowClipboard, answering, clipboard, DATE_TIME, open, qrText, typeInto, WEBSITE } from '../harness/site';
import { deleteRelayAddress, stack } from '../harness/stack';
import { validate } from '../harness/validators';

const ADD = 'Add relay anonymously';
const ADDED = 'The relay is added to the database. If the relay is available, it will soon appear in the table for everyone.';

interface Relays {
  /** The stack's relay as it is, and under the names of two other servers. */
  plain: string;
  viaDe: string;
  viaJp: string;
  /** An address nobody answers at. */
  nobody: string;
}
let relays: Relays;

/** A relay address of the stack's server with a key of its own: nobody has a relay there. */
const unreachable = () => `https://smp.e2e.test/r#${randomBytes(32).toString('base64url')}`;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(900_000);
  relays = await once<Relays, Relays>(
    'relays',
    async () => {
      const own = stack().relay;
      const c: Relays = {
        plain: own,
        viaDe: `${own.split('?')[0]}?h=de01.e2e.test&${own.split('?')[1]}`,
        viaJp: `${own.split('?')[0]}?h=jp01.e2e.test&${own.split('?')[1]}`,
        nobody: unreachable(),
      };
      const page = await browser.newPage();
      await open(page, '/#/relays');
      for (const url of [c.plain, c.viaDe, c.viaJp, c.nobody]) {
        const { told } = await add(page, ADD, url);
        expect(told).toBe(ADDED);
      }
      await validate('relays');
      await page.close();
      return { value: c, save: c };
    },
    (saved) => saved,
  );
});

// ---- helpers

const COLUMNS = ['Image', 'URI', 'Name', 'Status', 'Uptime', 'Last Check', 'Added'] as const;
type Column = (typeof COLUMNS)[number];
const cell = (r: Locator, column: Column) => r.getByRole('cell').nth(COLUMNS.indexOf(column));

async function relaysPage(page: Page, query = '') {
  await open(page, `/#/relays?${query}`);
  await expect(page.getByRole('heading', { name: '📡 Relays' })).toBeVisible();
}

/** The rows of the relays of the table, not its header. */
const rows = (page: Page) => page.getByRole('row').filter({ has: page.getByRole('cell') });
const select = (page: Page, has: string) => page.locator('select').filter({ hasText: has });
const statusFilter = (page: Page) => select(page, 'Offline');
const total = (page: Page, n: number) => expect(page.getByText(`Total relays matching filters: ${n}`)).toBeVisible();

/** The relays of the stack's server, which the stack's relay answers for: the three listed. */
const OURS = 'filterUrl=smp.e2e.test';

async function openRelayPage(page: Page, nth = 0) {
  await relaysPage(page, `${OURS}&filterStatus=any`);
  await cell(rows(page).nth(nth), 'Name').click();
  await expect(page).toHaveURL(new RegExp(`${WEBSITE}/#/relays/[0-9a-f-]{36}$`));
}

// ---- The page

// US-D1
test('the relays page: the text, the buttons, the filters and the table with its rows', async ({ page }) => {
  await relaysPage(page, `${OURS}&filterStatus=true`);
  await expect(page.getByText('Discover and share community-run SimpleX relays.')).toBeVisible();
  await expect(page.getByText('Here anyone can anonymously add relays to the public list. The availability of each relay is checked periodically.')).toBeVisible();
  await expect(page.getByRole('button', { name: ADD })).toBeVisible();
  await expect(page.getByRole('link', { name: 'How to deploy your own relay?' })).toHaveAttribute('href', '/#/faq');
  await expect(page.getByTitle('Refresh')).toBeVisible();
  await expect(select(page, 'Page size: 50')).toHaveValue('50');
  for (const name of ['Image', 'URI', 'Name', 'Status', 'Last Check', 'Added']) {
    await expect(page.getByRole('columnheader', { name: new RegExp(`^${name}`) })).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: /^Last Check ▼$/ })).toBeVisible();

  await expect(rows(page)).toHaveCount(3);
  const r = rows(page).first();
  await expect(cell(r, 'Image')).toContainText('📡');
  await expect(cell(r, 'URI')).toContainText(`${relays.plain.slice(0, 40)}…`);
  await expect(cell(r, 'Name')).toHaveText('relay');
  await expect(cell(r, 'Status')).toHaveText('Online');
  await expect(cell(r, 'Uptime')).toHaveText(/^100%\s*100%\s*100%$/);
  await expect(cell(r, 'Last Check')).toHaveText(/ago$/);
  await expect(cell(r, 'Added')).toHaveText(/ago$/);
  await expect(r).not.toHaveClass(/uk-text-danger/);
  await total(page, 3);
  await expect(page).toHaveScreenshot('relays.png', { fullPage: true, mask: [page.getByRole('table'), page.getByText(/^Total relays/)] });
});

test('the relays table with no relay to show says so', async ({ page }) => {
  await relaysPage(page, 'filterUrl=nothing-has-this&filterStatus=any');
  await expect(page.getByText('No relays found.')).toBeVisible();
  await total(page, 0);
});

// US-D2
test('clicking a relay\'s address copies it', async ({ page, context }) => {
  await allowClipboard(context);
  await relaysPage(page, 'filterUrl=de01&filterStatus=any');
  const uri = cell(rows(page).first(), 'URI');
  await expect(uri.locator('[uk-tooltip="Click to copy URI"]')).toBeVisible();
  const url = page.url();
  await uri.locator('[uk-tooltip="Click to copy URI"]').click();
  expect(await clipboard(page)).toBe(relays.viaDe);
  await expect(uri).toContainText('Copied to clipboard');
  await expect(uri).not.toContainText('Copied to clipboard', { timeout: 8_000 });
  expect(page.url()).toBe(url);
});

// US-D3
test('a click on a relay\'s row opens the relay\'s page', async ({ page }) => {
  await openRelayPage(page);
  await expect(page.getByRole('heading', { name: /^relay/ })).toBeVisible();
});

// US-D4
test('How to deploy your own relay? leads to the FAQ', async ({ page }) => {
  await relaysPage(page);
  await page.getByRole('link', { name: 'How to deploy your own relay?' }).click();
  await expect(page).toHaveURL(`${WEBSITE}/#/faq`);
});

// US-D5
test('🔄 fetches the table again', async ({ page }) => {
  await relaysPage(page, `${OURS}&filterStatus=any`);
  await expect(rows(page).first()).toBeVisible();
  const [request] = await Promise.all([page.waitForRequest(/v_relays_summaries/), page.getByTitle('Refresh').click()]);
  expect(request.url()).toContain('v_relays_summaries');
  await expect(rows(page).first()).toBeVisible();
});

// ---- Filters, sorting and pages

// US-D6
test('the filters above the table', async ({ page }) => {
  await relaysPage(page);
  await expect(page.getByPlaceholder('Filter by URI')).toBeVisible();
  await expect(page.getByPlaceholder('Filter by name')).toBeVisible();
  for (const [placeholder, label] of [['e.g. 90', 'Min uptime 7d (%)'], ['e.g. 80', 'Min uptime 30d (%)'], ['e.g. 70', 'Min uptime 90d (%)']]) {
    await expect(page.getByPlaceholder(placeholder)).toBeVisible();
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.locator('label', { hasText: 'Status' })).toBeVisible();
  await typeInto(page.getByPlaceholder('Filter by name'), 'rel');
  await expect(page).toHaveURL(/filterName=rel/, { timeout: 5_000 });
});

// US-D7
test('URI and Name filter the relays by their address and name, in any case', async ({ page }) => {
  await relaysPage(page, 'filterStatus=any');
  await typeInto(page.getByPlaceholder('Filter by URI'), 'JP01');
  await expect(rows(page)).toHaveCount(1);
  await expect(page).toHaveURL(/filterUrl=JP01/);
  await typeInto(page.getByPlaceholder('Filter by URI'), '');
  await expect(page).not.toHaveURL(/filterUrl=JP01/);
  await typeInto(page.getByPlaceholder('Filter by name'), 'RELA');
  await expect(rows(page).first()).toBeVisible();
  expect(await rows(page).count()).toBeGreaterThanOrEqual(3);
  await expect(page).toHaveURL(/filterName=RELA/);
  await typeInto(page.getByPlaceholder('Filter by name'), 'no relay is named so');
  await expect(page.getByText('No relays found.')).toBeVisible();
});

// US-D8
test('Status shows the relays online, offline, or all', async ({ page }) => {
  await relaysPage(page, `${OURS}&filterStatus=true`);
  await expect(rows(page)).toHaveCount(3);
  await statusFilter(page).selectOption({ label: 'Offline' });
  await expect(page.getByText('No relays found.')).toBeVisible();
  await statusFilter(page).selectOption({ label: 'Online' });
  await expect(rows(page)).toHaveCount(3);
  await statusFilter(page).selectOption({ label: 'Any' });
  await expect(rows(page)).toHaveCount(3);
});

// US-D9
test('Min uptime shows the relays whose uptime over the period is at least the number', async ({ page }) => {
  await relaysPage(page, `${OURS}&filterStatus=any`);
  await typeInto(page.getByPlaceholder('e.g. 90'), '100');
  await expect(page).toHaveURL(/filterUptime7=100/);
  await expect(rows(page)).toHaveCount(3);
  await typeInto(page.getByPlaceholder('e.g. 90'), '');
  await typeInto(page.getByPlaceholder('e.g. 80'), '100');
  await expect(page).toHaveURL(/filterUptime30=100/);
  await expect(rows(page)).toHaveCount(3);
  await typeInto(page.getByPlaceholder('e.g. 80'), '');
  await typeInto(page.getByPlaceholder('e.g. 70'), '100');
  await expect(page).toHaveURL(/filterUptime90=100/);
  await expect(rows(page)).toHaveCount(3);
});

// US-D10
test('a link with filters opens the table with them; with none, the filters last used, and on a first visit Online', async ({ page }) => {
  await relaysPage(page, 'filterStatus=any&filterName=rel');
  await expect(page.getByPlaceholder('Filter by name')).toHaveValue('rel');
  await expect(statusFilter(page)).toHaveValue('');

  await open(page, '/#/relays');
  await expect(page).toHaveURL(/filterStatus=true/);
  await expect(statusFilter(page)).toHaveValue('true');

  await statusFilter(page).selectOption({ label: 'Offline' });
  await typeInto(page.getByPlaceholder('Filter by name'), 'rel');
  await expect(page).toHaveURL(/filterName=rel/);
  await open(page, '/#/relays');
  await expect(statusFilter(page)).toHaveValue('false');
  await expect(page.getByPlaceholder('Filter by name')).toHaveValue('rel');
});

// US-D11
test('a column\'s title sorts the table by it, descending, then ascending', async ({ page }) => {
  await relaysPage(page, `${OURS}&filterStatus=any`);
  const added = page.getByRole('columnheader', { name: /^Added/ });
  await added.click();
  await expect(added).toHaveText('Added ▼');
  await expect(page).toHaveURL(/sortField=created_at/);
  await expect(page).toHaveURL(/sortOrder=desc/);
  await added.click();
  await expect(added).toHaveText('Added ▲');
  await expect(page).toHaveURL(/sortOrder=asc/);
  const name = page.getByRole('columnheader', { name: /^Name/ });
  await name.click();
  await expect(name).toHaveText('Name ▼');
  await page.getByRole('columnheader', { name: /^Status/ }).click();
  await expect(page).toHaveURL(/sortField=is_online/);
  await relaysPage(page, `${OURS}&filterStatus=any&sortField=url&sortOrder=asc`);
  await expect(page.getByRole('columnheader', { name: /^URI/ })).toHaveText('URI ▲');
});

// US-D12
test('Page size shows that many relays a page, from the first page, and puts it in the address', async ({ page }) => {
  await relaysPage(page, `${OURS}&filterStatus=any&pageSize=1&pageNumber=2`);
  await select(page, 'Page size: 50').selectOption({ label: 'Page size: 10' });
  await expect(page).toHaveURL(/pageSize=10/);
  await expect(page).toHaveURL(/pageNumber=1/);
  await expect(rows(page)).toHaveCount(3);
  await select(page, 'Page size: 50').selectOption({ label: 'Page size: 20' });
  await expect(page).toHaveURL(/pageSize=20/);
});

// US-D13
test('the page buttons, Previous page and Next page show the page, and put it in the address', async ({ page }) => {
  // The stack has three relays that answer: a page of one relay each.
  await relaysPage(page, `${OURS}&filterStatus=any&pageSize=1`);
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: '← Previous page' })).toBeHidden();
  await expect(page.getByRole('button', { name: '1', exact: true })).toHaveClass(/uk-button-secondary/);
  await page.getByRole('button', { name: 'Next page →' }).click();
  await expect(page).toHaveURL(/pageNumber=2/);
  await expect(page.getByRole('button', { name: '2', exact: true })).toHaveClass(/uk-button-secondary/);
  await page.getByRole('button', { name: '3', exact: true }).click();
  await expect(page).toHaveURL(/pageNumber=3/);
  await expect(page.getByRole('button', { name: 'Next page →' })).toBeHidden();
  await page.getByRole('button', { name: '← Previous page' }).click();
  await expect(page).toHaveURL(/pageNumber=2/);
});

// ---- A relay's page

// US-D14
test('a relay\'s page: the image, the name and status, the QR code, the address and the history', async ({ page }) => {
  await openRelayPage(page);
  const title = page.getByRole('heading', { name: /^relay/ });
  await expect(title).toContainText('Online');
  await expect(page.locator('div.uk-border-circle').filter({ hasText: '🤖' })).toBeVisible();
  await expect(page.getByText(/^Last check: .*ago$/)).toBeVisible();
  await expect(page.locator('canvas, svg:not([viewBox="0 0 250 250"]), img').filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator('[uk-tooltip="Click to copy URI"]')).toContainText('…');
  await expect(page.getByRole('heading', { name: 'Availability History' })).toBeVisible();
  const entries = page.locator('.timeline-entry');
  await expect(entries).toHaveCount(1);
  await expect(entries.first()).toContainText('Online');
  await expect(page.getByText(/^Added to the catalog .* ago$/)).toBeVisible();
  // What a run makes anew, which the screenshot masks: the relay's address, its QR code, and the times.
  const address = await qrText(page.locator('.uk-card svg'));
  expect([relays.plain, relays.viaDe, relays.viaJp]).toContain(address);
  const shown = (await page.locator('[uk-tooltip="Click to copy URI"]').innerText()).trim();
  expect(shown.endsWith('…') && address!.startsWith(shown.slice(0, -1))).toBe(true);
  await expect(entries.locator('.timeline-date')).toHaveText([DATE_TIME]);
  await expect(page).toHaveScreenshot('relay.png', {
    fullPage: true,
    mask: [
      // The QR code and the address under it, a column of one size whatever the address.
      page.locator('.uk-card svg').locator('..'), page.getByText(/^Last check: /),
      page.locator('.timeline-date'), page.getByText(/^Added to the catalog /),
    ],
  });
});

// US-D15
test('the address on a relay\'s page is copied by a click', async ({ page, context }) => {
  await allowClipboard(context);
  await openRelayPage(page);
  const copy = page.locator('[uk-tooltip="Click to copy URI"]');
  await copy.click();
  const copied = await clipboard(page);
  expect([relays.plain, relays.viaDe, relays.viaJp]).toContain(copied);
  await expect(copy).toContainText('Copied to clipboard');
});

// US-D16
test('the page of a relay the catalog does not list says so', async ({ page }) => {
  await open(page, '/#/relays/00000000-0000-0000-0000-000000000000');
  await expect(page.getByText('Relay not found.')).toBeVisible();
});

// ---- Adding a relay

// US-D17
test('Add relay anonymously asks for the relay\'s address', async ({ page }) => {
  await relaysPage(page);
  const dialogs = answering(page, { prompt: null });
  await page.getByRole('button', { name: ADD }).click();
  expect(await dialogs.next('prompt')).toBe('Enter relay URI:');
});

// US-D18
test('a relay\'s address is added, with or without the hosts, port and certificate of its server', async ({ page }) => {
  await relaysPage(page);
  const plain = unreachable();
  expect((await add(page, ADD, plain)).told).toBe(ADDED);
  expect(await relayAdded(plain)).toBe(true);
  const named = `${unreachable()}?h=abcdefghijklmnop.onion&p=5223&c=${randomBytes(32).toString('base64url')}`;
  expect((await add(page, ADD, named)).told).toBe(ADDED);
  expect(await relayAdded(named)).toBe(true);
  // Not listed: nobody has answered for it yet (US-D22).
  await relaysPage(page, 'filterStatus=any&filterUrl=abcdefghijklmnop');
  await expect(page.getByText('No relays found.')).toBeVisible();
});

// US-D19
test('an address the catalog has already is refused with the database\'s message', async ({ page }) => {
  await relaysPage(page);
  const url = unreachable();
  expect((await add(page, ADD, url)).told).toBe(ADDED);
  expect((await add(page, ADD, url)).told).toBe('duplicate key value violates unique constraint "relays_url_key"');
  expect(await relayAdded(url)).toBe(true);
});

// US-D20
test('an address that is not a relay\'s is refused with the reason, and nothing is added', async ({ page }) => {
  await relaysPage(page);
  const key = randomBytes(32).toString('base64url');
  const fp = randomBytes(32).toString('base64url');
  const refused: [string, string][] = [
    ['smp.e2e.test/r', 'Invalid URL format'],
    [`http://smp.e2e.test/r#${key}`, 'URL has invalid format. Schema must be HTTPS'],
    [`https://smp.e2e.test/a#${key}`, 'URL is not a relay address'],
    [`https://localhost/r#${key}`, 'Hostname is not allowed'],
    [`https://smp.e2e.test/r#${key}?h=localhost`, 'Hostname is not allowed'],
    [`https://smp.e2e.test/r#${randomBytes(20).toString('base64url')}`, 'URL has invalid format. Invalid contact data.'],
    [`https://smp.e2e.test:5223/r#${key}`, 'URL has invalid format. Invalid contact data.'],
    [`https://smp.e2e.test/r#${key}?p=99999`, 'URL has invalid format. Invalid contact data.'],
    [`https://smp.e2e.test/r#${key}?c=${randomBytes(10).toString('base64url')}`, 'URL has invalid format. Invalid contact data.'],
    [`https://smp.e2e.test/r#${key}?h=a;b&c=${fp}`, 'URL has invalid format. Invalid contact data.'],
  ];
  for (const [address, told] of refused) {
    expect((await add(page, ADD, address)).told, address).toBe(told);
    expect(await relayAdded(address), address).toBe(false);
  }
});

// US-D21
test('cancelling the question, or entering nothing, does nothing', async ({ page }) => {
  await relaysPage(page);
  const cancelled = answering(page, { prompt: null });
  await page.getByRole('button', { name: ADD }).click();
  await cancelled.next('prompt');
  await cancelled.none('alert');
  const empty = answering(page, { prompt: '' });
  await page.getByRole('button', { name: ADD }).click();
  await empty.next('prompt');
  await empty.none('alert');
});

// ---- What the checks show

// US-D22
test('after a check a relay that answered shows Online with its name; one nobody answered for is not listed', async ({ page }) => {
  await relaysPage(page, `${OURS}&filterStatus=any`);
  await expect(rows(page)).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await expect(cell(rows(page).nth(i), 'Name')).toHaveText('relay');
    await expect(cell(rows(page).nth(i), 'Status')).toHaveText('Online');
  }
  await relaysPage(page, `filterStatus=any&filterUrl=${encodeURIComponent(relays.nobody.split('#')[1])}`);
  await expect(page.getByText('No relays found.')).toBeVisible();
  // The image the relay answered with: the stack's relay has none, 📡 stands in its place.
});

// US-D23, US-D24 come last: they take the relay down and check again, which every relay's history shows.
test('after a check that finds no one at the relay\'s address it shows Offline with the name it had, and its uptime and history say so', async ({ page }) => {
  test.setTimeout(600_000);
  deleteRelayAddress();
  await validate('relays');
  await relaysPage(page, `${OURS}&filterStatus=any`);
  await expect(rows(page)).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    const r = rows(page).nth(i);
    await expect(cell(r, 'Name')).toHaveText('relay');
    await expect(cell(r, 'Status')).toHaveText('Offline');
    await expect(cell(r, 'Uptime')).toHaveText(/^50%\s*50%\s*50%$/);
    await expect(cell(r, 'Last Check')).toHaveText(/ago$/);
    await expect(r).toHaveClass(/uk-text-danger/);
  }
  await openRelayPage(page);
  await expect(page.getByRole('heading', { name: /^relay/ })).toContainText('Offline');
  const entries = page.locator('.timeline-entry');
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toContainText('Online');
  await expect(entries.nth(1)).toContainText('Offline');
  await statusFilterCheck(page);
});

async function statusFilterCheck(page: Page) {
  await relaysPage(page, `${OURS}&filterStatus=true`);
  await expect(page.getByText('No relays found.')).toBeVisible();
}
