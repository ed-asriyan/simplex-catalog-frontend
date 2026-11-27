// Epic B: the servers — their page, table, filters, labels, bulk mode, a server's
// page, adding a server, and what the catalog's check of them shows.
//
// The tests share one catalog set up once (beforeAll): servers added on the
// website, then checked by the servers validator, and one added after it, which
// stays unchecked. What a test changes — labels, filters — is its own browser's.
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  downServer, i2pServer, onionServer, smpServer, xftpServer, yggServer, smpIdentity, strangerServer, unknownServer, type Address,
} from '../harness/hosts';
import { add, allowClipboard, answering, clipboard, DATE_TIME, open, qrText, stubMap, typeInto, WEBSITE } from '../harness/site';
import { once } from '../harness/fixture';
import { validate } from '../harness/validators';

const ADD = 'Add server anonymously';

interface Catalog {
  online: Address; // answers, in Germany, and shares its identity with `sibling`
  sibling: Address;
  xftp: Address; // answers, in Germany
  xftpJp: Address; // the same XFTP server, in Japan: the same identity as `xftp`
  stranger: Address; // answers nothing as its identity is not the stack's: offline, with an identity of its own
  jp: Address; // answers, in Japan
  br: Address; // answers, in Brazil
  down: Address; // found in the Netherlands, does not answer
  tor: Address;
  i2p: Address;
  ygg: Address;
  unchecked: Address; // on a name nobody has: never checked
}
let catalog: Catalog;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(900_000);
  catalog = await once<Catalog, Catalog>(
    'servers',
    async () => {
      const page = await browser.newPage();
      const c: Catalog = {
        online: smpServer('DE'), sibling: smpServer('DE'), xftp: xftpServer('DE'), xftpJp: xftpServer('JP'), stranger: strangerServer('JP'), jp: smpServer('JP'), br: smpServer('BR'),
        down: downServer(), tor: onionServer(), i2p: i2pServer(), ygg: yggServer(), unchecked: unknownServer(),
      };
      await open(page, '/#/servers?filterStatus=');
      for (const a of [c.online, c.sibling, c.xftp, c.xftpJp, c.stranger, c.jp, c.br, c.down, c.tor, c.i2p, c.ygg]) {
        const { told } = await add(page, ADD, a.uri);
        expect(told).toContain('The server is added to the database.');
      }
      await validate('servers');
      await add(page, ADD, c.unchecked.uri);
      await page.close();
      return { value: c, save: c };
    },
    (saved) => saved,
  );
});

// ---- helpers: the page as a person reads it

/** The servers page with filters in its address, so it shows what the test is about. */
async function servers(page: Page, query = '') {
  await open(page, `/#/servers?${query}`);
  await expect(page.getByRole('heading', { name: '🌐 Servers Catalog' })).toBeVisible();
}

const row = (page: Page, host: string) => page.getByRole('row').filter({ hasText: host });
const cell = (r: Locator, column: Column) => r.getByRole('cell').nth(COLUMNS.indexOf(column));
const COLUMNS = ['', 'Labels', 'Type', 'URI', 'Location', 'Info page', 'Status', 'Uptime', 'Last Check', 'Added at', 'Details'] as const;
type Column = (typeof COLUMNS)[number];

/** The filter select with the option `has`. */
const select = (page: Page, has: string) => page.locator('select').filter({ hasText: has });

/** The hosts of the rows of the table, in the order shown. */
async function hosts(page: Page): Promise<string[]> {
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(rows.first()).toBeVisible();
  const cells = await rows.evaluateAll((els) =>
    els.filter((e) => e.querySelectorAll('td').length === 11).map((e) => (e.querySelectorAll('td')[3] as HTMLElement).innerText),
  );
  return cells.map((t) => t.trim().replace(/^…/, '').replace(/\s*Copied to clipboard$/, ''));
}

/** The types of the rows of the table, in the order shown. */
async function types(page: Page): Promise<string[]> {
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(rows.first()).toBeVisible();
  return rows.evaluateAll((els) => els.filter((e) => e.querySelectorAll('td').length === 11).map((e) => (e.querySelectorAll('td')[2] as HTMLElement).innerText.trim()));
}

/** What the table shows once nothing is loading and `host` is (or is not) in it. */
const shows = (page: Page, host: string) => expect(row(page, host)).toHaveCount(1);
const hides = (page: Page, host: string) => expect(row(page, host)).toHaveCount(0);

async function openServerPage(page: Page, a: Address) {
  await servers(page, `filterHost=${encodeURIComponent(a.host)}`);
  await row(page, a.host).getByRole('button', { name: 'Details' }).click();
  await expect(page).toHaveURL(new RegExp(`${WEBSITE}/#/servers/[0-9a-f-]{36}`));
}

// ---- The page

// US-B1
test('the servers page: the text, the counts, the add button, the filters and the table', async ({ page }) => {
  await servers(page);
  await expect(page.getByText('Discover and share community-run')).toContainText('SMP and XFTP servers.');
  await expect(page.getByRole('link', { name: 'SMP', exact: true })).toHaveAttribute('href', 'https://simplex.chat/docs/server.html#overview');
  await expect(page.getByRole('link', { name: 'XFTP', exact: true })).toHaveAttribute('href', 'https://simplex.chat/docs/xftp-server.html#overview');
  await expect(page.getByText('Here anyone can anonymously add servers to the public list. The availability of each server is checked periodically.')).toBeVisible();
  const countsLine = page.getByText(/^Active servers: \d+\s*·\s*TOR servers: \d+\s*·\s*Total countries: \d+$/);
  await expect(countsLine).toBeVisible();
  // Online at their latest check, in a country: the five of the catalog, in three countries, and the seed's.
  const counts = (await countsLine.innerText()).match(/\d+/g)!.map(Number);
  expect(counts[0]).toBeGreaterThanOrEqual(5);
  expect(counts[1]).toBe(0);
  expect(counts[2]).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole('button', { name: ADD })).toBeVisible();
  await expect(page.getByRole('link', { name: 'How to deploy your own server?' })).toHaveAttribute('href', '/#/faq');
  await expect(page.locator('svg[viewBox="0 0 960 600"]')).toBeVisible();
  for (const placeholder of ['Filter by host', 'Filter by identity']) await expect(page.getByPlaceholder(placeholder)).toBeVisible();
  for (const [placeholder, name] of [['e.g. 90', 'Min uptime 7d (%)'], ['e.g. 80', 'Min uptime 30d (%)'], ['e.g. 70', 'Min uptime 90d (%)']]) {
    await expect(page.getByPlaceholder(placeholder)).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await expect(page.getByTitle('Refresh')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import labels' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export labels' })).toBeVisible();
  await expect(select(page, 'Page size: 50')).toHaveValue('50');
  await expect(page.getByRole('button', { name: 'Bulk mode (0)' })).toBeDisabled();
  for (const name of ['Labels', 'Type', 'URI', 'Location', 'Info page', 'Status', 'Last Check', 'Added at', 'Details']) {
    await expect(page.getByRole('columnheader', { name: new RegExp(`^${name}`) })).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: /^Last Check ▼$/ })).toBeVisible();
  await expect(page.getByText(/^Total servers matching filters: \d+$/)).toBeVisible();
  await expect(page).toHaveScreenshot('servers.png', {
    fullPage: true,
    mask: [page.locator('svg[viewBox="0 0 960 600"]'), page.locator('table'), page.getByText(/^Total servers/), page.getByText(/^Active servers/)],
  });
});

// The world map: the stack's own, with Germany, Japan and Brazil (the website loads it from a CDN).
const COUNTRY = { DE: 0, JP: 1, BR: 2 };
const country = (page: Page, code: keyof typeof COUNTRY) => page.locator('svg[viewBox="0 0 960 600"] path.country').nth(COUNTRY[code]);
/** The darkness of a country on the map: the opacity its colour has. */
const opacity = async (c: Locator) => parseInt(((await c.getAttribute('fill')) ?? '').slice(7, 9) || '00', 16);

test.describe('the world map', () => {
  test.beforeEach(async ({ context }) => {
    await stubMap(context);
  });

  // US-B2
  test('the countries with servers online are coloured, the more servers the darker', async ({ page }) => {
    await servers(page);
    await expect(country(page, 'DE')).toHaveClass(/cursor/);
    await expect(country(page, 'JP')).toHaveClass(/cursor/);
    await expect(country(page, 'BR')).toHaveClass(/cursor/);
    // Germany has more of the catalog's servers online (three, and the seed's) than Japan (one).
    expect(await opacity(country(page, 'DE'))).toBeGreaterThan(await opacity(country(page, 'JP')));
    expect(await opacity(country(page, 'JP'))).toBeGreaterThan(0);
  });

  // US-B3
  test('hovering a coloured country shows its flag, its name and the number of its servers online', async ({ page }) => {
    await servers(page);
    await country(page, 'JP').hover();
    const tip = page.locator('.tooltips');
    await expect(tip).toContainText('🇯🇵');
    await expect(tip).toContainText('Japan');
    // Both an SMP and an XFTP server of the catalog are online in Japan.
    await expect(tip).toContainText('2 servers');
    await country(page, 'BR').hover();
    await expect(tip).toContainText('Brazil');
    await expect(tip).toContainText('1 servers');
  });

  // US-B4
  test('clicking a coloured country shows the servers online there: Location holds it, Status is Active', async ({ page }) => {
    await servers(page, `filterStatus=false&filterHost=.test`);
    await country(page, 'JP').click();
    await expect(select(page, 'Inactive')).toHaveValue('true');
    await expect(page).toHaveURL(/filterCountriesList=JP/);
    await expect(page).toHaveURL(/filterCountriesInclusive=true/);
    await expect(locationFilter(page).getByRole('button').first()).toHaveText('1 selected');
    await expect(page.getByPlaceholder('Filter by host')).toHaveValue('.test');
    await shows(page, catalog.jp.host);
    await hides(page, catalog.online.host);
    await hides(page, catalog.br.host);
  });
});

// US-B5
test('the servers table: a row of a server online, one offline and one not checked yet', async ({ page }) => {
  await servers(page, 'filterHost=.test');
  const online = row(page, catalog.online.host);
  await expect(cell(online, 'Type')).toHaveText('SMP');
  await expect(cell(online, 'URI')).toContainText(catalog.online.host);
  await expect(cell(online, 'Location')).toHaveText(/Germany/);
  await expect(cell(online, 'Location')).toContainText('🇩🇪');
  await expect(cell(online, 'Status')).toHaveText('Online');
  await expect(cell(online, 'Uptime')).toHaveText(/^100%\s*100%\s*100%$/);
  await expect(cell(online, 'Last Check')).toHaveText(/ago$/);
  await expect(cell(online, 'Added at')).toHaveText(/ago$/);
  await expect(cell(online, 'Details').getByRole('button', { name: 'Details' })).toBeVisible();
  await expect(online).not.toHaveClass(/uk-text-danger/);

  const down = row(page, catalog.down.host.slice(-30));
  await expect(cell(down, 'Location')).toContainText('Netherlands');
  await expect(cell(down, 'Status')).toHaveText('Offline');
  await expect(cell(down, 'Uptime')).toHaveText(/^0%\s*0%\s*0%$/);
  await expect(down).toHaveClass(/uk-text-danger/);

  const unchecked = row(page, catalog.unchecked.host.slice(-30));
  await expect(cell(unchecked, 'Status')).toHaveText('Unknown');
  await expect(cell(unchecked, 'Uptime')).toHaveText(/^N\/A\s*N\/A\s*N\/A$/);
  await expect(cell(unchecked, 'Last Check')).toHaveText('');
  await expect(cell(unchecked, 'Location')).toHaveText('');
  await expect(unchecked).toHaveClass(/uk-text-danger/);

  const xftp = row(page, catalog.xftp.host);
  await expect(cell(xftp, 'Type')).toHaveText('XFTP');
  await expect(page.getByText(/^Total servers matching filters: \d+$/)).toBeVisible();
});

// US-B5 (the location of a server on one of the networks the validator tells apart)
test('the location column shows TOR, I2P and Yggdrasil for the servers on them', async ({ page }) => {
  await servers(page, 'filterHost=.');
  await expect(cell(row(page, catalog.tor.host.slice(-30)), 'Location')).toContainText('TOR');
  await expect(cell(row(page, catalog.i2p.host.slice(-30)), 'Location')).toContainText('I2P');
  await expect(cell(row(page, catalog.ygg.host.slice(-30)), 'Location')).toContainText('Yggdrasil');
});

// US-B6
test('clicking a server\'s host copies its whole address', async ({ page, context }) => {
  await allowClipboard(context);
  await servers(page, `filterHost=${catalog.online.host}`);
  const uri = cell(row(page, catalog.online.host), 'URI');
  await expect(uri.locator('span[uk-tooltip]').first()).toHaveAttribute('uk-tooltip', 'Click to copy full URI');
  await uri.getByText(catalog.online.host).click();
  expect(await clipboard(page)).toBe(catalog.online.uri);
  // The table shows nothing of it; a server's page shows *Copied to clipboard* in the host's place for 4 seconds.
  await expect(uri).not.toContainText('Copied to clipboard');
});

test('on a server\'s page the host copied says so for 4 seconds', async ({ page, context }) => {
  await allowClipboard(context);
  await openServerPage(page, catalog.online);
  // The first of the two copyable hosts of the page: the one under the QR code.
  const copy = page.locator('span.pointer').first();
  await copy.click();
  expect(await clipboard(page)).toBe(catalog.online.uri);
  await expect(copy).toHaveText('Copied to clipboard');
  await expect(copy).toContainText(catalog.online.host, { timeout: 8_000 });
});

// US-B7, US-B15 (Yes), US-B50: a server's info page is found by asking its host over HTTPS for a
// page that mentions SimpleX, through the stack's gateway; the stack has no HTTPS server whose
// certificate the validator trusts, so every server of it is checked to have none.

// US-B8
test('Details, or anywhere in the row but its controls, opens the server\'s page', async ({ page }) => {
  await servers(page, `filterHost=${catalog.online.host}`);
  await row(page, catalog.online.host).getByRole('button', { name: 'Details' }).click();
  await expect(page).toHaveURL(new RegExp(`${WEBSITE}/#/servers/[0-9a-f-]{36}$`));
  await expect(page.getByRole('heading', { name: new RegExp(`^SMP ${catalog.online.host}`) })).toBeVisible();

  await servers(page, `filterHost=${catalog.online.host}`);
  await cell(row(page, catalog.online.host), 'Type').click();
  await expect(page).toHaveURL(new RegExp(`${WEBSITE}/#/servers/[0-9a-f-]{36}$`));
});

test('the row\'s check box, labels and host do not open the server\'s page', async ({ page }) => {
  await servers(page, `filterHost=${catalog.online.host}`);
  const r = row(page, catalog.online.host);
  const url = page.url();
  await cell(r, '').getByRole('checkbox').check();
  await cell(r, 'Labels').locator('.uk-label').first().click();
  await cell(r, 'URI').getByText(catalog.online.host).click();
  expect(page.url()).toBe(url);
});

// US-B9
test('How to deploy your own server? leads to the FAQ', async ({ page }) => {
  await servers(page);
  await page.getByRole('link', { name: 'How to deploy your own server?' }).click();
  await expect(page).toHaveURL(`${WEBSITE}/#/faq`);
});

// ---- Filters

// US-B10
test('the filters above the table', async ({ page }) => {
  await servers(page);
  for (const label of ['URI', 'Identity', 'Type', 'Status', 'Info page', 'Location', 'Labels', 'Min uptime 7d (%)', 'Min uptime 30d (%)', 'Min uptime 90d (%)']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await typeInto(page.getByPlaceholder('Filter by host'), 'de01');
  await expect(page).toHaveURL(/filterHost=de01/, { timeout: 5_000 });
});

// US-B11
test('URI filters the servers by their host, in any case', async ({ page }) => {
  await servers(page, 'filterHost=');
  await typeInto(page.getByPlaceholder('Filter by host'), catalog.online.host.toUpperCase());
  await shows(page, catalog.online.host);
  await hides(page, catalog.sibling.host);
  await hides(page, catalog.xftp.host);
});

// US-B12
test('Identity filters the servers by their identity, in any case', async ({ page }) => {
  await servers(page, 'filterHost=.test');
  await typeInto(page.getByPlaceholder('Filter by identity'), smpIdentity().slice(2, 12).toUpperCase());
  await shows(page, catalog.online.host);
  await shows(page, catalog.sibling.host);
  await hides(page, catalog.xftp.host);
});

// US-B13
test('Type shows the SMP servers, the XFTP servers or both', async ({ page }) => {
  await servers(page, 'filterHost=.test');
  await select(page, 'XFTP').selectOption({ label: 'XFTP' });
  await shows(page, catalog.xftp.host);
  await hides(page, catalog.online.host);
  await select(page, 'XFTP').selectOption({ label: 'SMP' });
  await shows(page, catalog.online.host);
  await hides(page, catalog.xftp.host);
  await select(page, 'XFTP').selectOption({ label: 'All' });
  await shows(page, catalog.online.host);
  await shows(page, catalog.xftp.host);
});

// US-B14
test('Status shows the servers online, offline, not checked yet, or all', async ({ page }) => {
  await servers(page, 'filterHost=.test');
  const status = select(page, 'Inactive');
  const down = catalog.down.host.slice(-30);
  const unchecked = catalog.unchecked.host.slice(-30);
  await status.selectOption({ label: 'Active' });
  await shows(page, catalog.online.host);
  await hides(page, down);
  await hides(page, unchecked);
  await status.selectOption({ label: 'Inactive' });
  await shows(page, down);
  await hides(page, catalog.online.host);
  await hides(page, unchecked);
  // Unknown is put in the address, which reads back as no filter: all the servers, and Any chosen.
  await status.selectOption({ label: 'Unknown' });
  await expect(page).toHaveURL(/filterStatus=unknown/);
  await shows(page, unchecked);
  await shows(page, down);
  await shows(page, catalog.online.host);
  await expect(status).toHaveValue('any');
  await status.selectOption({ label: 'Any' });
  await shows(page, down);
  await shows(page, unchecked);
  await shows(page, catalog.online.host);
});

// US-B15
test('Info page shows the servers with an info page, or without one, or all', async ({ page }) => {
  await servers(page, 'filterHost=.test');
  const info = select(page, 'Yes');
  await info.selectOption({ label: 'No' });
  await shows(page, catalog.online.host);
  await info.selectOption({ label: 'Yes' });
  await hides(page, catalog.online.host);
  await info.selectOption({ label: 'Any' });
  await shows(page, catalog.online.host);
});

/** The button of the Location filter, and the list it opens. */
const locationFilter = (page: Page) => page.locator('div').filter({ hasText: /^Location\s*(Any|\d+ selected)/ }).last();
const locations = async (page: Page) => {
  const f = locationFilter(page);
  await f.getByRole('button').first().click();
  return f.locator('[uk-dropdown]');
};

// US-B16
test('Location opens the list of the locations of the servers, TOR, Yggdrasil and I2P first, each as Not …', async ({ page }) => {
  await servers(page, 'filterHost=.');
  await expect(locationFilter(page).getByRole('button').first()).toHaveText('Any');
  const list = await locations(page);
  await expect(list.getByText('Exclusive', { exact: true })).toBeVisible();
  const texts = (await list.locator('div.uk-margin-small').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  expect(texts.slice(0, 3)).toEqual(['Not TOR', 'Not Yggdrasil', 'Not 🧄 I2P']);
  expect(texts.some((t) => /^Not .*Germany$/.test(t))).toBe(true);
});

const location = (list: Locator, name: string) => list.locator('div.uk-margin-small').filter({ hasText: name });

// US-B17
test('ticking a location hides the servers there; ticking another hides its servers too', async ({ page }) => {
  await servers(page, 'filterHost=.test&filterStatus=');
  const list = await locations(page);
  await location(list, 'Germany').getByRole('checkbox').check();
  await expect(locationFilter(page).getByRole('button').first()).toHaveText('1 selected');
  await hides(page, catalog.online.host);
  await hides(page, catalog.sibling.host);
  await hides(page, catalog.xftp.host);
  await shows(page, catalog.jp.host);
  await shows(page, catalog.br.host);
  await location(list, 'Japan').getByRole('checkbox').check();
  await expect(locationFilter(page).getByRole('button').first()).toHaveText('2 selected');
  await hides(page, catalog.jp.host);
  await shows(page, catalog.br.host);
});

// US-B18
test('Exclusive turns to Inclusive: the servers in the locations ticked, and no Not before them', async ({ page }) => {
  await servers(page, 'filterHost=.test&filterStatus=');
  const list = await locations(page);
  await location(list, 'Germany').getByRole('checkbox').check();
  await list.getByText('Exclusive', { exact: true }).click();
  await expect(list.getByText('Inclusive', { exact: true })).toBeVisible();
  await expect(location(list, 'Germany')).not.toContainText('Not');
  await shows(page, catalog.online.host);
  await shows(page, catalog.sibling.host);
  await hides(page, catalog.jp.host);
  await hides(page, catalog.down.host);
  await list.getByText('Inclusive', { exact: true }).click();
  await expect(list.getByText('Exclusive', { exact: true })).toBeVisible();
  await hides(page, catalog.online.host);
  await shows(page, catalog.jp.host);
});

// US-B19
test('Clear unticks every location', async ({ page }) => {
  await servers(page, 'filterHost=.');
  const list = await locations(page);
  await expect(list.getByText('Clear', { exact: true })).toBeHidden();
  await location(list, 'TOR').getByRole('checkbox').check();
  await list.getByText('Clear', { exact: true }).click();
  await expect(locationFilter(page).getByRole('button').first()).toHaveText('Any');
  await expect(list.getByRole('checkbox', { checked: true })).toHaveCount(0);
});

const labelsFilter = (page: Page) => page.locator('div').filter({ hasText: /^Labels\s*(Any|\d+ selected)/ }).last();

// US-B20
test('Labels filters by my labels as Location does: Not added hides the servers labelled, Inclusive shows them only', async ({ page }) => {
  await servers(page, 'filterHost=de0');
  await cell(row(page, catalog.online.host), 'Labels').locator('.uk-label').first().click();
  const f = labelsFilter(page);
  await f.getByRole('button').first().click();
  const list = f.locator('[uk-dropdown]');
  await expect(list.getByText('Exclusive', { exact: true })).toBeVisible();
  await expect(list.locator('div.uk-margin-small').first()).toContainText('Not');
  await list.locator('div.uk-margin-small').filter({ hasText: 'added' }).getByRole('checkbox').check();
  await expect(f.getByRole('button').first()).toHaveText('1 selected');
  await hides(page, catalog.online.host);
  await shows(page, catalog.sibling.host);
  await list.getByText('Exclusive', { exact: true }).click();
  await shows(page, catalog.online.host);
  await hides(page, catalog.sibling.host);
});

// US-B21
test('Min uptime shows the servers whose uptime over the period is at least the number', async ({ page }) => {
  await servers(page, 'filterHost=.test&filterStatus=');
  await typeInto(page.getByPlaceholder('e.g. 90'), '100');
  await shows(page, catalog.online.host);
  await hides(page, catalog.down.host.slice(-30));
  await typeInto(page.getByPlaceholder('e.g. 90'), '');
  await typeInto(page.getByPlaceholder('e.g. 80'), '100');
  await shows(page, catalog.online.host);
  await hides(page, catalog.down.host.slice(-30));
  await typeInto(page.getByPlaceholder('e.g. 80'), '');
  await typeInto(page.getByPlaceholder('e.g. 70'), '100');
  await shows(page, catalog.online.host);
  await hides(page, catalog.down.host.slice(-30));
});

// US-B22
test('a link with filters in its address opens the table with them set', async ({ page }) => {
  await servers(page, `filterProtocol=xftp&filterHost=.test&filterStatus=true`);
  await shows(page, catalog.xftp.host);
  await hides(page, catalog.online.host);
  await expect(select(page, 'XFTP')).toHaveValue('xftp');
  await expect(select(page, 'Inactive')).toHaveValue('true');
  await expect(page.getByPlaceholder('Filter by host')).toHaveValue('.test');
});

// US-B23
test('with no filter in the address: on a first visit Status Active, later the filters last used', async ({ page }) => {
  await open(page, '/#/servers');
  await expect(page).toHaveURL(/filterStatus=true/);
  await expect(select(page, 'Inactive')).toHaveValue('true');
  await shows(page, catalog.online.host);
  await hides(page, catalog.down.host.slice(-30));

  await select(page, 'Inactive').selectOption({ label: 'Inactive' });
  await expect(select(page, 'Inactive')).toHaveValue('false');
  await open(page, '/#/servers');
  await expect(select(page, 'Inactive')).toHaveValue('false');
  await expect(page).toHaveURL(/filterStatus=false/);
});

// US-B24
test('Active servers sets Status to Active', async ({ page }) => {
  await servers(page, 'filterStatus=false&filterHost=.test');
  await page.getByText(/^Active servers:/).click();
  await expect(select(page, 'Inactive')).toHaveValue('true');
  await expect(page.getByPlaceholder('Filter by host')).toHaveValue('.test');
});

// US-B25
test('TOR servers sets Location to TOR alone, inclusive, and Status to Active', async ({ page }) => {
  await servers(page, 'filterStatus=false&filterHost=.');
  await page.getByText(/TOR servers:/).click();
  await expect(select(page, 'Inactive')).toHaveValue('true');
  await expect(page).toHaveURL(/filterCountriesList=TOR/);
  await expect(page).toHaveURL(/filterCountriesInclusive=true/);
  await expect(locationFilter(page).getByRole('button').first()).toHaveText('1 selected');
  await expect(page.getByPlaceholder('Filter by host')).toHaveValue('.');
});

// US-B26
test('Total countries sets Location to Not TOR, exclusive, and Status to Active', async ({ page }) => {
  await servers(page, 'filterStatus=false&filterHost=.');
  await page.getByText(/Total countries:/).click();
  await expect(select(page, 'Inactive')).toHaveValue('true');
  await expect(page).toHaveURL(/filterCountriesList=TOR/);
  await expect(page).toHaveURL(/filterCountriesInclusive=false/);
  const list = await locations(page);
  await expect(list.getByText('Exclusive', { exact: true })).toBeVisible();
  await expect(location(list, 'TOR').getByRole('checkbox')).toBeChecked();
  await expect(location(list, 'TOR')).toContainText('Not');
});

// ---- Sorting and pages

// US-B27
test('a column\'s title sorts the table by it, descending, then ascending', async ({ page }) => {
  await servers(page, 'filterHost=.test&filterStatus=');
  const type = page.getByRole('columnheader', { name: /^Type/ });
  await type.click();
  await expect(type).toHaveText('Type ▼');
  await expect(page).toHaveURL(/sortField=protocol/);
  await expect(page).toHaveURL(/sortOrder=desc/);
  expect((await types(page))[0]).toBe('XFTP');
  await type.click();
  await expect(type).toHaveText('Type ▲');
  await expect(page).toHaveURL(/sortOrder=asc/);
  expect((await types(page))[0]).toBe('SMP');

  await servers(page, 'filterHost=.test&filterStatus=&sortField=host&sortOrder=asc');
  const listed = await hosts(page);
  expect(listed).toEqual([...listed].sort());
  await expect(page.getByRole('columnheader', { name: /^URI/ })).toHaveText('URI ▲');
});

// US-B28
test('Page size shows that many servers a page, and is not kept in the address', async ({ page }) => {
  await servers(page, 'filterHost=.test&filterStatus=');
  const size = select(page, 'Page size: 5');
  await size.selectOption({ label: 'Page size: 5' });
  await expect.poll(async () => (await hosts(page)).length).toBe(5);
  expect(page.url()).not.toContain('pageSize');
  await servers(page, 'filterHost=.test&filterStatus=&pageSize=10');
  await expect(size).toHaveValue('10');
  await expect.poll(async () => (await hosts(page)).length).toBeGreaterThanOrEqual(9);
  expect((await hosts(page)).length).toBeLessThanOrEqual(10);
  await servers(page, 'filterHost=.test&filterStatus=');
  await expect(size).toHaveValue('50');
});

// US-B29
test('the page buttons, Previous page and Next page show the page, and 🔄 fetches the table again', async ({ page }) => {
  await servers(page, 'filterHost=.test&filterStatus=&pageSize=5');
  const first = await hosts(page);
  expect(first).toHaveLength(5);
  await expect(page.getByRole('button', { name: '← Previous page' })).toBeHidden();
  await page.getByRole('button', { name: 'Next page →' }).click();
  await expect(page).toHaveURL(/pageNumber=2/);
  await expect.poll(async () => (await hosts(page)).some((h) => !first.includes(h))).toBe(true);
  await expect(page.getByRole('button', { name: '2', exact: true })).toHaveClass(/uk-button-secondary/);
  await page.getByRole('button', { name: '← Previous page' }).click();
  await expect(page).toHaveURL(/pageNumber=1/);
  await page.getByRole('button', { name: '2', exact: true }).click();
  await expect(page).toHaveURL(/pageNumber=2/);
  await page.getByTitle('Refresh').click();
  await expect(page.getByRole('row').filter({ has: page.getByRole('cell') }).first()).toBeVisible();
});

// ---- Labels

const labelOf = (r: Locator, which: '✅' | '🚫') => cell(r, 'Labels').locator('.uk-label').filter({ hasText: which });

// US-B30
test('the labels of a server: set by a click, cleared by another, kept in my browser', async ({ page }) => {
  await servers(page, `filterHost=${catalog.online.host}`);
  const added = labelOf(row(page, catalog.online.host), '✅');
  await expect(added).toHaveClass(/uk-label-muted/);
  await added.click();
  await expect(added).not.toHaveClass(/uk-label-muted/);
  await servers(page, `filterHost=${catalog.online.host}`);
  await expect(labelOf(row(page, catalog.online.host), '✅')).not.toHaveClass(/uk-label-muted/);
  await expect(labelOf(row(page, catalog.online.host), '🚫')).toHaveClass(/uk-label-muted/);
  await labelOf(row(page, catalog.online.host), '✅').click();
  await expect(labelOf(row(page, catalog.online.host), '✅')).toHaveClass(/uk-label-muted/);
  // Another person's browser has its own.
});

// US-B31
test('Export labels saves my labels as a file', async ({ page }, testInfo) => {
  await servers(page, `filterHost=${catalog.online.host}`);
  await labelOf(row(page, catalog.online.host), '✅').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export labels' }).click()]);
  // The browser saves the colons of the time as underscores.
  expect(download.suggestedFilename()).toMatch(/^127\.0\.0\.1_labels_\d{4}-\d{2}-\d{2}T\d{2}[:_]\d{2}[:_]\d{2}\.\d{3}Z\.json$/);
  const file = testInfo.outputPath('labels.json');
  await download.saveAs(file);
  const saved = JSON.parse(await (await import('node:fs/promises')).readFile(file, 'utf8'));
  expect(saved.added).toHaveLength(1);
  expect(saved.ignored).toEqual([]);
});

const labelsFile = (added: string[], ignored: string[]) => ({
  name: 'labels.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ added, ignored })),
});

// US-B32
test('Import labels asks to replace my labels, and replaces them when I confirm', async ({ page }) => {
  await servers(page, `filterHost=${catalog.online.host}`);
  const dialogs = answering(page, { confirm: true });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import labels' }).click()]);
  await chooser.setFiles(labelsFile(['a', 'b', 'c'], ['d']));
  expect(await dialogs.next('confirm')).toBe(
    'The current labels in this browser will be replaced by the import:\n\nLabel "added": 3 servers\nLabel "ignored": 1 servers\n\nContinue?',
  );
  await page.getByRole('button', { name: 'Export labels' }).click().catch(() => {});
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('labels_servers_uuid') ?? '{}'))).toEqual({
    added: ['a', 'b', 'c'], ignored: ['d'],
  });
});

// US-B33
test('cancelling the import leaves my labels as they were', async ({ page }) => {
  await servers(page, `filterHost=${catalog.online.host}`);
  await labelOf(row(page, catalog.online.host), '✅').click();
  const before = await page.evaluate(() => localStorage.getItem('labels_servers_uuid'));
  const dialogs = answering(page, { confirm: false });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import labels' }).click()]);
  await chooser.setFiles(labelsFile(['a'], []));
  await dialogs.next('confirm');
  expect(await page.evaluate(() => localStorage.getItem('labels_servers_uuid'))).toBe(before);
  await expect(labelOf(row(page, catalog.online.host), '✅')).not.toHaveClass(/uk-label-muted/);
});

// ---- Bulk mode

/** Ticks the rows of the hosts, and opens bulk mode. */
async function bulk(page: Page, picks: Address[]) {
  await servers(page, 'filterHost=.test&filterStatus=true');
  for (const a of picks) await cell(row(page, a.host), '').getByRole('checkbox').check();
  await page.getByRole('button', { name: `Bulk mode (${picks.length})` }).click();
  return page.getByRole('dialog');
}

/** Of `picks`, those the table shows, in its order: the order bulk mode goes through them in. */
async function inTableOrder(page: Page, picks: Address[]): Promise<Address[]> {
  const shown = await hosts(page);
  return [...picks].sort((a, b) => shown.indexOf(a.host) - shown.indexOf(b.host));
}

// US-B34
test('ticked rows count in Bulk mode, which needs two; the head\'s box ticks all and unticks them', async ({ page }) => {
  await servers(page, 'filterHost=.test&filterStatus=true');
  const mode = (n: number) => page.getByRole('button', { name: `Bulk mode (${n})` });
  await expect(mode(0)).toBeDisabled();
  await cell(row(page, catalog.online.host), '').getByRole('checkbox').check();
  await expect(mode(1)).toBeDisabled();
  await mode(1).hover({ force: true });
  await cell(row(page, catalog.sibling.host), '').getByRole('checkbox').check();
  await expect(mode(2)).toBeEnabled();
  await page.getByRole('columnheader').first().getByRole('checkbox').check();
  const all = (await hosts(page)).length;
  await expect(mode(all)).toBeEnabled();
  await page.getByRole('columnheader').first().getByRole('checkbox').uncheck();
  await expect(mode(0)).toBeDisabled();
});

// US-B35
test('Bulk mode shows the first server ticked, as the table lists them, in a dialog', async ({ page }) => {
  const picks = [catalog.online, catalog.sibling, catalog.xftp];
  const dialog = await bulk(page, picks);
  const first = (await inTableOrder(page, picks))[0];
  await expect(dialog).toContainText('1 / 3');
  await expect(dialog.getByText('URI:', { exact: true })).toBeVisible();
  await expect(dialog.getByText(first.host)).toBeVisible();
  await expect(dialog.getByText('Online', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/^100%\s*100%\s*100%$/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Next →', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Mark as added and Next →' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '← Back' })).toBeHidden();
});

// US-B36
test('Next → shows the next server; on the last one it reads Close and closes the dialog', async ({ page }) => {
  const dialog = await bulk(page, [catalog.online, catalog.sibling]);
  await dialog.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(dialog).toContainText('2 / 2');
  await expect(dialog.getByRole('button', { name: '← Back' })).toBeVisible();
  await dialog.locator('button', { hasText: /^Close$/ }).click();
  await expect(dialog).toBeHidden();
});

// US-B37
test('← Back shows the server before', async ({ page }) => {
  const dialog = await bulk(page, [catalog.online, catalog.sibling]);
  await dialog.getByRole('button', { name: 'Next →', exact: true }).click();
  await dialog.getByRole('button', { name: '← Back' }).click();
  await expect(dialog).toContainText('1 / 2');
});

// US-B38
test('Mark as added sets the ✅ label and goes on; it is saved only by a later label click', async ({ page }) => {
  const dialog = await bulk(page, [catalog.online, catalog.sibling]);
  await dialog.getByRole('button', { name: 'Mark as added and Next →' }).click();
  await expect(dialog).toContainText('2 / 2');
  await dialog.getByRole('button', { name: 'Mark as added and Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(labelOf(row(page, catalog.online.host), '✅')).not.toHaveClass(/uk-label-muted/);
  await expect(labelOf(row(page, catalog.sibling.host), '✅')).not.toHaveClass(/uk-label-muted/);
  expect(await page.evaluate(() => localStorage.getItem('labels_servers_uuid'))).toBeNull();
  await page.reload();
  await expect(labelOf(row(page, catalog.online.host), '✅')).toHaveClass(/uk-label-muted/);

});

test('a label set by a click saves all my labels, the one marked as added included', async ({ page }) => {
  const dialog = await bulk(page, [catalog.online, catalog.sibling]);
  await dialog.getByRole('button', { name: 'Mark as added and Next →' }).click();
  await dialog.getByRole('button', { name: 'Mark as added and Close' }).click();
  await expect(dialog).toBeHidden();
  await labelOf(row(page, catalog.xftp.host), '🚫').click();
  await page.reload();
  await expect(labelOf(row(page, catalog.xftp.host), '🚫')).not.toHaveClass(/uk-label-muted/);
  await expect(labelOf(row(page, catalog.online.host), '✅')).not.toHaveClass(/uk-label-muted/);
});

// US-B39
test('the dialog\'s ✕ and Escape close it', async ({ page }) => {
  const dialog = await bulk(page, [catalog.online, catalog.sibling]);
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
  await expect(dialog).toBeHidden();
  const again = await bulk(page, [catalog.online, catalog.sibling]);
  await page.keyboard.press('Escape');
  await expect(again).toBeHidden();
});

// ---- A server's page

// US-B40
test('a server\'s page: its type and host, its identity, the QR code, the table\'s values and its history', async ({ page }) => {
  await openServerPage(page, catalog.online);
  await expect(page.getByRole('heading', { name: `SMP ${catalog.online.host}` })).toBeVisible();
  await expect(page.getByText(`Identity ${catalog.online.identity}`)).toBeVisible();
  // Every SMP server of the stack has the identity of the stack's SMP server: the others are many.
  await expect(page.getByRole('link', { name: /^There are \d+ more servers with this identity →$/ })).toBeVisible();
  await expect(page.getByText('URI:', { exact: true })).toBeVisible();
  for (const label of ['Location', 'Status', 'Uptime', 'Info page', 'Last check', 'Added at', 'Labels', 'URI']) {
    await expect(page.getByRole('cell', { name: label, exact: true })).toBeVisible();
  }
  const table = page.getByRole('table');
  await expect(table.getByRole('row', { name: /^Status/ })).toContainText('Online');
  await expect(table.getByRole('row', { name: /^Uptime/ })).toContainText('100%');
  await expect(table.getByRole('row', { name: /^Last check/ })).toContainText('ago');
  await expect(page.getByRole('heading', { name: 'Availability History' })).toBeVisible();
  const entries = page.locator('.timeline-entry');
  await expect(entries).toHaveCount(1);
  await expect(entries.first()).toContainText('Online');
  await expect(entries.first()).toContainText('Not Available');
  await expect(entries.first().locator('.timeline-dot')).toHaveCSS('background-color', 'rgb(240, 80, 110)');
  // What a run makes anew, which the screenshot masks: the stack's identity and the QR code of an address with it,
  // how many servers share it so far, and the times.
  expect(await qrText(page.locator('.uk-card svg'))).toBe(catalog.online.uri);
  await expect(table.getByRole('row', { name: /^Added at/ })).toContainText('ago');
  await expect(entries.locator('.timeline-date')).toHaveText([DATE_TIME]);
  await expect(page).toHaveScreenshot('server.png', {
    fullPage: true,
    mask: [
      page.locator('.uk-card code'), page.locator('.uk-card svg'), page.getByRole('link', { name: /^There are \d+ more servers/ }),
      table.getByRole('row', { name: /^Last check/ }).getByRole('cell').last(), table.getByRole('row', { name: /^Added at/ }).getByRole('cell').last(),
      page.locator('.timeline-date'),
    ],
  });
});

test('a server unchecked yet has no availability data', async ({ page }) => {
  await openServerPage(page, catalog.unchecked);
  await expect(page.getByText('No availability data yet.')).toBeVisible();
  await expect(page.getByRole('row', { name: /^Status/ })).toContainText('Unknown');
});

test('an offline server\'s history: Offline, and its info page Not Available', async ({ page }) => {
  await openServerPage(page, catalog.down);
  const entry = page.locator('.timeline-entry').first();
  await expect(entry).toContainText('Offline');
  await expect(entry).toContainText('Not Available');
  await expect(entry.locator('.timeline-dot')).toHaveCSS('background-color', 'rgb(240, 80, 110)');
});

test('a server without others of its identity says nothing of them', async ({ page }) => {
  await openServerPage(page, catalog.stranger);
  await expect(page.getByText(/more servers? with this identity/)).toBeHidden();
});

// US-B41
test('the link to the servers of the same identity opens the table with them', async ({ page }) => {
  // The XFTP server is added twice, under two names: one more server of its identity.
  await openServerPage(page, catalog.xftp);
  await page.getByRole('link', { name: 'There is 1 more server with this identity →' }).click();
  await expect(page).toHaveURL(`${WEBSITE}/#/servers?filterIdentity=${encodeURIComponent(catalog.xftp.identity)}`);
  await expect(page.getByPlaceholder('Filter by identity')).toHaveValue(catalog.xftp.identity);
  await shows(page, catalog.xftpJp.host);
});

// US-B42
test('a page of a server the catalog does not have says so', async ({ page }) => {
  await open(page, '/#/servers/00000000-0000-0000-0000-000000000000');
  await expect(page.getByText('Server not found.')).toBeVisible();
});

// ---- Adding a server

// US-B43
test('Add server anonymously asks for the server\'s address', async ({ page }) => {
  await servers(page);
  const dialogs = answering(page, { prompt: null });
  await page.getByRole('button', { name: ADD }).click();
  expect(await dialogs.next('prompt')).toBe('Enter SMP or XFTP server URI:');
});

// US-B44
test('a server entered is added, and is in the table at once, Unknown until its first check', async ({ page }) => {
  const a = unknownServer();
  await servers(page);
  const { told } = await add(page, ADD, a.uri);
  expect(told).toBe('The server is added to the database. If the server is available, it will soon appear in the table for everyone.');
  // Not under the Active of a first visit: it is not online yet.
  await hides(page, a.host.slice(-30));
  await servers(page, `filterHost=${encodeURIComponent(a.host)}`);
  await expect(cell(row(page, a.host.slice(-30)), 'Status')).toHaveText('Unknown');
  await select(page, 'Inactive').selectOption({ label: 'Any' });
  await shows(page, a.host.slice(-30));
});

// US-B45
test('an address with several hosts adds a server for each, with the same identity', async ({ page }) => {
  const first = smpServer('JP');
  const second = downServer();
  await servers(page);
  const { told } = await add(page, ADD, `smp://${first.identity}@${first.host},${second.host}`);
  expect(told).toContain('The server is added to the database.');
  await servers(page, `filterIdentity=${encodeURIComponent(first.identity)}`);
  await shows(page, first.host);
  await shows(page, second.host.slice(-30));
});

// US-B46
test('an address the catalog has already is accepted the same way, and changes nothing', async ({ page }) => {
  await servers(page, `filterHost=${catalog.online.host}`);
  await expect(row(page, catalog.online.host)).toHaveCount(1);
  const { told } = await add(page, ADD, catalog.online.uri);
  expect(told).toBe('The server is added to the database. If the server is available, it will soon appear in the table for everyone.');
  await servers(page, `filterHost=${catalog.online.host}`);
  await expect(row(page, catalog.online.host)).toHaveCount(1);
});

// US-B47
test('an address that is not a SMP or XFTP server\'s is refused, and cancelling does nothing', async ({ page }) => {
  await servers(page);
  for (const wrong of ['https://smp.example.com', 'smp://smp.example.com']) {
    const { told } = await add(page, ADD, wrong);
    expect(told).toBe('Invalid URI format');
  }
  await servers(page, 'filterHost=https');
  await expect(page.getByText('Total servers matching filters: 0')).toBeVisible();

  const dialogs = answering(page, { prompt: null });
  await page.getByRole('button', { name: ADD }).click();
  await dialogs.next('prompt');
  await dialogs.none('alert');
  const empty = answering(page, { prompt: '' });
  await page.getByRole('button', { name: ADD }).click();
  await empty.next('prompt');
  await empty.none('alert');
});

// ---- What the checks show

// US-B48
test('after a check a server answering shows Online, one that does not Offline, and the check is in its history', async ({ page }) => {
  await servers(page, 'filterHost=.test&filterStatus=');
  await expect(cell(row(page, catalog.online.host), 'Status')).toHaveText('Online');
  await expect(cell(row(page, catalog.xftp.host), 'Status')).toHaveText('Online');
  await expect(cell(row(page, catalog.down.host.slice(-30)), 'Status')).toHaveText('Offline');
  await expect(cell(row(page, catalog.online.host), 'Last Check')).toHaveText(/(a few seconds|a minute|\d+ minutes?|an hour) ago/);
  await openServerPage(page, catalog.online);
  await expect(page.locator('.timeline-entry')).toHaveCount(1);
});

// US-B49
test('after a check the location of a server on Tor, I2P or Yggdrasil is that network', async ({ page }) => {
  await servers(page, 'filterHost=.');
  await expect(cell(row(page, catalog.tor.host.slice(-30)), 'Location')).toContainText('TOR');
  await expect(cell(row(page, catalog.i2p.host.slice(-30)), 'Location')).toContainText('I2P');
  await expect(cell(row(page, catalog.ygg.host.slice(-30)), 'Location')).toContainText('Yggdrasil');
  // A server on the clearnet is in the country of its address.
  await expect(cell(row(page, catalog.online.host), 'Location')).toContainText('Germany');
  await expect(cell(row(page, catalog.jp.host), 'Location')).toContainText('Japan');
  await expect(cell(row(page, catalog.br.host), 'Location')).toContainText('Brazil');
  await servers(page, 'filterHost=nowhere');
  await expect(cell(row(page, catalog.unchecked.host.slice(-30)), 'Location')).toHaveText('');
});

// US-B50: see US-B7

// US-B51
test('after a check a server\'s uptime is the share of the hours it was Online', async ({ page }) => {
  await servers(page, 'filterHost=.test&filterStatus=');
  await expect(cell(row(page, catalog.online.host), 'Uptime')).toHaveText(/^100%\s*100%\s*100%$/);
  await expect(cell(row(page, catalog.down.host.slice(-30)), 'Uptime')).toHaveText(/^0%\s*0%\s*0%$/);
  await expect(cell(row(page, catalog.unchecked.host.slice(-30)), 'Uptime')).toHaveText(/^N\/A\s*N\/A\s*N\/A$/);
});

