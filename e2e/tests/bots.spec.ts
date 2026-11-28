// Epic C: the bots — their page and cards, search and filter, a bot's page,
// adding a bot, the maintainer's approval, and what the checks show.
//
// The tests share one catalog set up once (beforeAll): bots of the stack's
// bots CLI, added on the website, approved as the maintainer does, and checked
// by the bots validator twice, the second time with one of them gone. The test
// of the maintainer's approval comes last, as it adds a bot and checks again.
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { Bot, type SavedBot } from '../harness/bots';
import { once } from '../harness/fixture';
import { addedBot, approveBot, submitBot } from '../harness/maintainer';
import { add, allowClipboard, answering, clipboard, DATE_TIME, looks, open, opensTab, stubOtherWebsites, typeInto, WEBSITE } from '../harness/site';
import { validate } from '../harness/validators';

const ADD = 'Add bot anonymously';

// A 1×1 picture, for a bot with an image.
const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const GREETING = 'Hi! I am Echo Bot.\nSend /help for the commands.';

let echo: Bot; // online in both checks, with all a bot can have
let flaky: Bot; // online in the first check, does not accept the second time
let quiet: Bot; // accepts the contact and writes nothing
let plain: Bot; // no description, no commands
let ghost: Bot; // checked once, then its address is deleted
let pending: Bot; // added, not approved
let fillers: Bot[]; // to fill the pages

/** A made-up address of a bot: a short link whose key is 32 bytes. */
const shortLink = () => `https://smp.e2e.test/a#${randomBytes(32).toString('base64url')}`;


interface Catalog {
  echo: Bot;
  flaky: Bot;
  quiet: Bot;
  plain: Bot;
  ghost: Bot;
  pending: Bot;
  fillers: Bot[];
}

test.beforeAll(async () => {
  test.setTimeout(1_500_000);
  const made = await once<Catalog, Record<keyof Catalog, unknown>>(
    'bots',
    async () => {
      const profile = (name: string, extra = {}) => ({ name, description: `${name.split(' ')[0]} description.`, greeting: `Hello from ${name}`, ...extra });
      const c: Catalog = {
        echo: await Bot.create({
          name: 'Echo Bot {}', description: 'Echoes what you write.', image: IMAGE, greeting: GREETING,
          commands: [{ keyword: 'help', label: 'Show help' }, { keyword: 'echo', label: 'Echo the text back' }],
        }),
        flaky: await Bot.create(profile('Flaky Bot {}', { description: 'Sometimes there.', greeting: 'I am here, sometimes.' })),
        quiet: await Bot.create({ name: 'Quiet Bot {}', description: 'Says nothing at first.' }),
        plain: await Bot.create({ name: 'Plain Bot {}', greeting: 'Plain hello.' }),
        ghost: await Bot.create(profile('Ghost Bot {}', { description: 'Gone without a word.', greeting: 'Boo.' })),
        pending: await Bot.create(profile('Pending Bot {}')),
        fillers: [],
      };
      for (let i = 1; i <= 12; i++) c.fillers.push(await Bot.create(profile(`Filler Bot ${String(i).padStart(2, '0')} {}`)));
      const others = [c.flaky, c.quiet, c.plain, c.ghost, ...c.fillers];
      // The stack's bots are on a server of their own: the website refuses their addresses (US-C18).
      for (const b of [c.echo, ...others, c.pending]) await submitBot(b.address);
      for (const b of [c.echo, ...others]) await approveBot(b.address);
      await validate('bots');
      await c.flaky.goOffline();
      await c.ghost.deleteAddress();
      await validate('bots');
      return { value: c, save: JSON.parse(JSON.stringify(c)) };
    },
    async (saved: any) => ({
      echo: await Bot.revive(saved.echo), flaky: await Bot.revive(saved.flaky), quiet: await Bot.revive(saved.quiet),
      plain: await Bot.revive(saved.plain), ghost: await Bot.revive(saved.ghost), pending: await Bot.revive(saved.pending),
      fillers: await Promise.all(saved.fillers.map((f: SavedBot) => Bot.revive(f))),
    }),
  );
  ({ echo, flaky, quiet, plain, ghost, pending, fillers } = made);
});

// ---- helpers

async function bots(page: Page, query = 'filterStatus=true') {
  await open(page, `/#/bots?${query}`);
  await expect(page.getByRole('heading', { name: '🤖 Bots' })).toBeVisible();
}

/** What of a bot's name is one word, to search for it by: the page does not read a space of its address back. */
const key = (bot: Bot) => bot.name.split(' ').pop()!;

/** The status filter of the page: the select with the options All, Online and Offline. */
const status = (page: Page) => page.locator('select').filter({ hasText: 'Offline' });
const search = (page: Page) => page.getByRole('searchbox', { name: 'Search' });
const card = (page: Page, bot: Bot) => page.locator('.uk-card').filter({ has: page.getByRole('heading', { name: bot.name }) });
const cards = (page: Page) => page.locator('.uk-card');
const total = (page: Page, n: number | RegExp) =>
  expect(page.getByText(typeof n === 'number' ? `Total bots matching filters: ${n}` : n)).toBeVisible();

async function openBotPage(page: Page, bot: Bot) {
  // Any status: with a search in the address, the page does not fall back to the filters it starts with.
  await bots(page, `filterStatus=any&q=${key(bot)}`);
  await card(page, bot).click({ position: { x: 5, y: 5 } });
  await expect(page).toHaveURL(new RegExp(`${WEBSITE}/#/bots/[0-9a-f-]{36}$`));
  await expect(page.getByRole('heading', { name: new RegExp(bot.name) })).toBeVisible();
}

// ---- The page

// US-C1
test('the bots page: the text, the controls, and the cards, the bots online first', async ({ page }) => {
  await bots(page, 'filterStatus=true&q=Bot');
  await expect(cards(page)).toHaveCount(12);
  await bots(page, `filterStatus=true&q=${key(echo)}`);
  await expect(page.getByText('Discover and share community-run SimpleX bots.')).toBeVisible();
  await expect(page.getByText('Here anyone can anonymously add bots to the public list. The availability of each bot is checked periodically.')).toBeVisible();
  await expect(page.getByRole('button', { name: ADD })).toBeVisible();
  await expect(page.getByRole('link', { name: 'How to create your own bot?' })).toHaveAttribute('href', '/#/faq');
  await expect(page.getByTitle('Refresh')).toBeVisible();
  await expect(search(page)).toBeVisible();
  await expect(status(page)).toBeVisible();
  await total(page, 1);

  const c = card(page, echo);
  await expect(c).toBeVisible();
  await expect(c.locator('img[alt="Avatar"]')).toHaveAttribute('src', IMAGE);
  await expect(c).toContainText('Echoes what you write.');
  await expect(c).toContainText(/Last check: .*ago/);
  await expect(c.getByText('Offline')).toBeHidden();
  await expect(c.getByRole('link', { name: 'Visit' })).toBeVisible();

  // A bot without a description, and without an image.
  await bots(page, `filterStatus=true&q=${key(plain)}`);
  const p = card(page, plain);
  await expect(p).toContainText('No description');
  await expect(p).toContainText('🤖');
  await expect(search(page)).toHaveValue(key(plain));
  // What a run makes anew, which the screenshot masks: the time of the check.
  await looks(page, 'bots', [[cards(page).getByText(/^Last check: /), '16em']]);
});

// US-C1 (the order: online first; a bot offline is marked)
test('the bots online come first, and a bot offline at its latest check is marked', async ({ page }) => {
  await bots(page, 'filterStatus=any&q=Bot&pageNumber=2');
  const offline = card(page, flaky);
  await expect(offline.getByText('Offline', { exact: true })).toBeVisible();
  await expect(offline).toContainText(/Last check: .*ago/);
  await expect(offline).toContainText('Sometimes there.');
  // Last of all, after those online.
  await expect(cards(page).last()).toContainText(flaky.name);
  // Not on the first page, where those online are.
  await bots(page, 'filterStatus=any&q=Bot&pageNumber=1');
  await expect(cards(page)).toHaveCount(12);
  await expect(card(page, flaky)).toHaveCount(0);
  await expect(cards(page).getByText('Offline', { exact: true })).toHaveCount(0);
});

// US-C2
test('Visit opens the bot\'s address in a new tab and not the bot\'s page', async ({ page, context }) => {
  await stubOtherWebsites(context);
  await bots(page, `filterStatus=true&q=${key(echo)}`);
  const visit = card(page, echo).getByRole('link', { name: 'Visit' });
  await expect(visit).toHaveAttribute('target', '_blank');
  const before = page.url();
  expect(await opensTab(page, visit)).toBe(echo.address);
  expect(page.url()).toBe(before);
});

// US-C3
test('a card opens the bot\'s page', async ({ page }) => {
  await openBotPage(page, echo);
});

// US-C4
test('How to create your own bot? leads to the FAQ', async ({ page }) => {
  await bots(page);
  await page.getByRole('link', { name: 'How to create your own bot?' }).click();
  await expect(page).toHaveURL(`${WEBSITE}/#/faq`);
});

// US-C5
test('🔄 fetches the cards again', async ({ page }) => {
  await bots(page);
  await expect(cards(page).first()).toBeVisible();
  const [request] = await Promise.all([page.waitForRequest(/v_bot_summaries/), page.getByTitle('Refresh').click()]);
  expect(request.url()).toContain('v_bot_summaries');
  await expect(cards(page).first()).toBeVisible();
});

// ---- Search, filter and pages

// US-C6
test('Search shows the bots whose name or description contains the text, in any case, from the first page', async ({ page }) => {
  await bots(page);
  await status(page).selectOption({ label: 'All' });
  await page.getByRole('button', { name: '2', exact: true }).click();
  await expect(page).toHaveURL(/pageNumber=2/);
  await typeInto(search(page), 'ECHO');
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, echo)).toBeVisible();
  await expect(page).toHaveURL(/q=ECHO/);
  await expect(page).toHaveURL(/pageNumber=1/);
  // By the description.
  await typeInto(search(page), 'Sometimes');
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, flaky)).toBeVisible();
});

// US-C7
test('the status filter shows the bots online, offline, or all, from the first page', async ({ page }) => {
  await bots(page, 'filterStatus=true&q=Bot');
  await status(page).selectOption({ label: 'Offline' });
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, flaky)).toBeVisible();
  await status(page).selectOption({ label: 'Online' });
  await expect(card(page, flaky)).toHaveCount(0);
  await expect(cards(page)).toHaveCount(12);
  await status(page).selectOption({ label: 'All' });
  await expect(page).toHaveURL(/filterStatus=any/);
  await total(page, /^Total bots matching filters: 1[5-9]$/);
});

// US-C8
test('a search that finds no bot after one that found some says so, with 0 matching and no page buttons', async ({ page }) => {
  await bots(page, 'filterStatus=any');
  await typeInto(search(page), 'echo');
  await expect(cards(page)).toHaveCount(1);
  await total(page, 1);
  await typeInto(search(page), 'no bot has this in its name');
  await expect(cards(page)).toHaveCount(0);
  await total(page, 0);
  await expect(page.locator('.pages button')).toHaveCount(0);
  await looks(page, 'bots-empty');
});

// US-C9
test('a link with a search and a filter opens the page with them', async ({ page }) => {
  await bots(page, 'filterStatus=false&q=sometimes');
  await expect(status(page)).toHaveValue('false');
  await expect(search(page)).toHaveValue('sometimes');
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, flaky)).toBeVisible();
});

// US-C10
test('with neither in the address: on a first visit no search and Online, later those last used', async ({ page }) => {
  await open(page, '/#/bots');
  await expect(page).toHaveURL(/filterStatus=true/);
  await expect(status(page)).toHaveValue('true');
  await expect(search(page)).toHaveValue('');

  await status(page).selectOption({ label: 'Offline' });
  await typeInto(search(page), 'sometimes');
  await expect(page).toHaveURL(/q=sometimes/);
  await open(page, '/#/bots');
  await expect(status(page)).toHaveValue('false');
  await expect(search(page)).toHaveValue('sometimes');
  await expect(card(page, flaky)).toBeVisible();
});

// US-C11
test('the page buttons, Previous page and Next page show the page, and put it in the address', async ({ page }) => {
  await bots(page, 'filterStatus=any&q=Bot');
  await expect(page.getByRole('button', { name: '← Previous page' })).toBeHidden();
  await expect(page.getByRole('button', { name: '1', exact: true })).toHaveClass(/uk-button-secondary/);
  await page.getByRole('button', { name: 'Next page →' }).click();
  await expect(page).toHaveURL(/pageNumber=2/);
  await expect(page.getByRole('button', { name: '2', exact: true })).toHaveClass(/uk-button-secondary/);
  await expect(card(page, flaky)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page →' })).toBeHidden();
  await page.getByRole('button', { name: '← Previous page' }).click();
  await expect(page).toHaveURL(/pageNumber=1/);
  await page.getByRole('button', { name: '2', exact: true }).click();
  await expect(page).toHaveURL(/pageNumber=2/);
});

// ---- A bot's page

// US-C12
test('a bot\'s page: the image, the name and status, the address, the description, the commands, the first message, the uptime', async ({ page }) => {
  await openBotPage(page, echo);
  await expect(page.locator(`img[alt="${echo.name}"]`)).toHaveAttribute('src', IMAGE);
  const title = page.getByRole('heading', { name: new RegExp(echo.name) });
  await expect(title).toContainText('Online');
  await expect(page.getByText(/^Last check: .*ago$/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the bot' })).toHaveAttribute('href', echo.address);
  await expect(page.locator('[uk-tooltip="Copy connection link to clipboard"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Description' })).toBeVisible();
  await expect(page.getByText('Echoes what you write.')).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Commands' })).toBeVisible();
  const commands = page.getByRole('table').first();
  await expect(commands.getByRole('columnheader')).toHaveText(['Keyword', 'Label']);
  await expect(commands.getByRole('row').nth(1)).toContainText('help');
  await expect(commands.getByRole('row').nth(1)).toContainText('Show help');
  await expect(commands.getByRole('row').nth(2)).toContainText('echo');
  await expect(commands.getByRole('row').nth(2)).toContainText('Echo the text back');

  await expect(page.getByRole('heading', { name: "The First Bot's Message" })).toBeVisible();
  const message = page.locator('.uk-placeholder');
  expect(await message.evaluate((e) => (e as HTMLElement).textContent)).toBe(GREETING);
  await expect(message).toHaveCSS('white-space', 'pre-wrap');

  await expect(page.getByRole('heading', { name: 'Uptime' })).toBeVisible();
  for (const period of ['7 days', '30 days', '90 days']) await expect(page.getByText(period, { exact: true })).toBeVisible();
  await expect(page.getByText('100%')).toHaveCount(3);
  await expect(page.locator('.timeline-entry')).toHaveCount(1);
  await expect(page.locator('.timeline-entry').first()).toContainText('Online');
  await expect(page.getByText(/^The bot was added to the catalog .* ago$/)).toBeVisible();
  // What a run makes anew, which the screenshot masks: the times.
  await expect(page.locator('.timeline-date')).toHaveText([DATE_TIME]);
  await looks(page, 'bot', [
    [page.getByText(/^Last check: /), '16em'],
    [page.locator('.timeline-date'), '8em'],
    [page.getByText(/^The bot was added to the catalog /), '24em'],
  ]);
});

test('a bot without a description, commands or message: what its page says instead', async ({ page }) => {
  await openBotPage(page, quiet);
  await expect(page.getByText('Empty.', { exact: false })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Commands' })).toBeHidden();
  await expect(page.getByRole('heading', { name: "The First Bot's Message" })).toBeHidden();

  await openBotPage(page, plain);
  await expect(page.getByText(/Empty\. Read "The First Bot's Message" to understand how the bot works\./)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Commands' })).toBeHidden();
  await expect(page.getByRole('heading', { name: "The First Bot's Message" })).toBeVisible();
  await expect(page.locator('div.uk-border-circle').filter({ hasText: '🤖' })).toBeVisible();
});

// US-C13
test('Open the bot opens the bot\'s address in a new tab', async ({ page, context }) => {
  await stubOtherWebsites(context);
  await openBotPage(page, echo);
  const link = page.getByRole('link', { name: 'Open the bot' });
  await expect(link).toHaveAttribute('target', '_blank');
  expect(await opensTab(page, link)).toBe(echo.address);
});

// US-C14
test('the copy icon copies the bot\'s address', async ({ page, context }) => {
  await allowClipboard(context);
  await openBotPage(page, echo);
  await page.locator('[uk-tooltip="Copy connection link to clipboard"]').click();
  expect(await clipboard(page)).toBe(echo.address);
});

// US-C15
test('the page of a bot the catalog does not list says so', async ({ page }) => {
  await open(page, '/#/bots/00000000-0000-0000-0000-000000000000');
  await expect(page.getByText('Bot not found.')).toBeVisible();
  await expect(page.locator('.uk-alert-warning')).toBeVisible();
});

// ---- Adding a bot
//
// The website asks for the address and tells what it did in the browser's own dialogs, drawn outside the page: they
// have no screenshot, and their texts are checked.

// US-C16
test('Add bot anonymously asks for the invite link', async ({ page }) => {
  await bots(page);
  const dialogs = answering(page, { prompt: null });
  await page.getByRole('button', { name: ADD }).click();
  expect(await dialogs.next('prompt')).toBe('Enter invite link:');
});

const SUBMITTED = 'The bot was submitted and will appear after it has been moderated and approved.';

// US-C17
test('a bot\'s short link, or its full address, is submitted, and is not listed until approved', async ({ page }) => {
  await bots(page);
  const short = shortLink();
  expect((await add(page, ADD, short)).told).toBe(SUBMITTED);
  const full = `https://simplex.chat/contact#/?v=2-7&smp=${encodeURIComponent(`smp://${randomBytes(32).toString('base64url')}@smp.e2e.test`)}&e2e=${Date.now()}`;
  expect((await add(page, ADD, full)).told).toBe(SUBMITTED);
  // The maintainer sees both, neither approved.
  expect(await addedBot(short)).toMatchObject({ approved: null });
  expect(await addedBot(full)).toMatchObject({ approved: null });
});

// US-C18
test('a short link with anything after its key is refused, and nothing is added', async ({ page }) => {
  await bots(page);
  const link = `${shortLink()}?c=${randomBytes(32).toString('base64url')}`;
  expect((await add(page, ADD, link)).told).toBe('URL has invalid format. Invalid contact data.');
  expect(await addedBot(link)).toBeUndefined();
  // The address of a bot of the stack, on a server of its own, is one of them.
  expect(echo.address).toContain('?c=');
  expect((await add(page, ADD, echo.address)).told).toBe('URL has invalid format. Invalid contact data.');
});

// US-C19
test('an address the catalog has already is accepted the same way, and nothing changes', async ({ page }) => {
  await bots(page);
  const link = shortLink();
  expect((await add(page, ADD, link)).told).toBe(SUBMITTED);
  expect((await add(page, ADD, link)).told).toBe(SUBMITTED);
  expect(await addedBot(link)).toMatchObject({ approved: null });
});

// US-C20
test('an address that is not a bot\'s is refused with the reason, and nothing is added', async ({ page }) => {
  await bots(page);
  const key = randomBytes(32).toString('base64url');
  const refused: [string, string][] = [
    ['smp.e2e.test/a', 'Invalid URL format'],
    [`http://smp.e2e.test/a#${key}`, 'URL has invalid format. Schema must be HTTPS'],
    [`https://smp.e2e.test/g#${key}`, 'URL is not a bot address'],
    [`https://simplex.chat/contact#/?data=${encodeURIComponent(JSON.stringify({ groupLinkId: 'abc' }))}&smp=${encodeURIComponent('smp://a@b.c')}`, 'URL is not a bot address'],
    [`https://localhost/a#${key}`, 'Hostname is not allowed'],
    [`https://smp.e2e.test/a#${randomBytes(20).toString('base64url')}`, 'URL has invalid format. Invalid contact data.'],
    [`https://simplex.chat/contact#/?v=2-7&e2e=${Date.now()}`, 'URL has invalid format. Invalid contact data.'],
  ];
  for (const [address, told] of refused) {
    expect((await add(page, ADD, address)).told, address).toBe(told);
    expect(await addedBot(address), address).toBeUndefined();
  }
});

// US-C21
test('cancelling the question, or entering nothing, does nothing', async ({ page }) => {
  await bots(page);
  const cancelled = answering(page, { prompt: null });
  await page.getByRole('button', { name: ADD }).click();
  await cancelled.next('prompt');
  await cancelled.none('alert');
  const empty = answering(page, { prompt: '' });
  await page.getByRole('button', { name: ADD }).click();
  await empty.next('prompt');
  await empty.none('alert');
});

// ---- Approval and checks

// US-C23
test('a bot the maintainer has not approved is not listed, and its page is not found', async ({ page }) => {
  const row = await addedBot(pending.address);
  expect(row).toMatchObject({ approved: null });
  await bots(page, 'filterStatus=any&q=Pending');
  await total(page, 0);
  await expect(cards(page)).toHaveCount(0);
  await open(page, `/#/bots/${row!.id}`);
  // Not the "Bot not found." of an id nobody has: an error, in red.
  await expect(page.getByText('Error: Bot not found')).toBeVisible();
  await expect(page.locator('.uk-alert-danger')).toBeVisible();
});

// US-C24
test('after a check a bot shows the name, description, image and commands its address gives', async ({ page }) => {
  await bots(page, `filterStatus=true&q=${key(echo)}`);
  const c = card(page, echo);
  await expect(c.getByRole('heading', { name: echo.name })).toBeVisible();
  await expect(c).toContainText('Echoes what you write.');
  await expect(c.locator('img[alt="Avatar"]')).toHaveAttribute('src', IMAGE);
  await openBotPage(page, echo);
  await expect(page.getByRole('row', { name: /help Show help/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /echo Echo the text back/ })).toBeVisible();
});

// US-C25
test('after a check a bot that accepted the catalog shows Online, one that did not Offline, with its Last check', async ({ page }) => {
  await openBotPage(page, echo);
  await expect(page.getByRole('heading', { name: new RegExp(echo.name) })).toContainText('Online');
  await expect(page.getByText(/^Last check: .*ago$/)).toBeVisible();
  await openBotPage(page, quiet);
  await expect(page.getByRole('heading', { name: new RegExp(quiet.name) })).toContainText('Online');
  await bots(page, `filterStatus=false&q=${key(flaky)}`);
  await card(page, flaky).click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('heading', { name: new RegExp(flaky.name) })).toContainText('Offline');
  await expect(page.getByText(/^Last check: .*ago$/)).toBeVisible();
  // That the catalog connects incognito and deletes the contact is not seen from outside.
});

// US-C26
test('after a check of a bot whose address no longer exists it shows what the last check found', async ({ page }) => {
  await openBotPage(page, ghost);
  await expect(page.getByRole('heading', { name: new RegExp(ghost.name) })).toContainText('Online');
  await expect(page.getByText('Gone without a word.')).toBeVisible();
  await expect(page.locator('.uk-placeholder')).toHaveText('Boo.');
  // Nothing was recorded by the second check: one check in its history.
  await expect(page.getByText('100%')).toHaveCount(3);
  await expect(page.locator('.timeline-entry')).toHaveCount(1);
});

// US-C27
test('after a check the first message is the one the bot wrote, kept when it writes nothing', async ({ page }) => {
  await openBotPage(page, flaky);
  await expect(page.locator('.uk-placeholder')).toHaveText('I am here, sometimes.');
  await openBotPage(page, quiet);
  await expect(page.getByRole('heading', { name: "The First Bot's Message" })).toBeHidden();
});

// US-C28
test('after each check a bot\'s uptime is the share of the checks that found it Online, and its timeline shows the changes', async ({ page }) => {
  await openBotPage(page, flaky);
  await expect(page.getByText('50%')).toHaveCount(3);
  const timeline = page.locator('.timeline-entry');
  await expect(timeline).toHaveCount(2);
  await expect(timeline.nth(0)).toContainText('Online');
  await expect(timeline.nth(1)).toContainText('Offline');
  await openBotPage(page, echo);
  await expect(page.getByText('100%')).toHaveCount(3);
  // Online in both checks: nothing different from the one before, one entry.
  await expect(page.locator('.timeline-entry')).toHaveCount(1);
});

// US-C22 comes last: it adds a bot and checks again, which every other bot's history shows.
test('the bot the maintainer approves is checked from the next check on, and listed once its profile is read', async ({ page }) => {
  test.setTimeout(900_000);
  await approveBot(pending.address);
  expect(await addedBot(pending.address)).toMatchObject({ approved: true });
  // Not listed before a check has read its profile.
  await bots(page, 'filterStatus=any&q=Pending');
  await total(page, 0);
  await expect(cards(page)).toHaveCount(0);
  await validate('bots');
  await bots(page, 'filterStatus=true&q=Pending');
  await expect(card(page, pending)).toBeVisible();
  await expect(card(page, pending)).toContainText('Pending description.');
});
