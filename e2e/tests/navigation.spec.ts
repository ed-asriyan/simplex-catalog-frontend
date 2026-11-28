// Epic A: getting around — the header and its menu, the footer, the FAQ.
// These pages hold nothing of the catalog's data.
import { expect, test, type Page } from '@playwright/test';
import { looks, open, opensTab, stubOtherWebsites, WEBSITE } from '../harness/site';

/** The corner's picture, the link of no size around it being what the person clicks. */
const corner = (page: Page) => page.locator('a[aria-label="View source on GitHub"] svg');

const MENU = ['🌐 Servers', '🤖 Bots', '📡 Relays', '👥 Groups', '📢 Channels', '🎨 Themes', '❓ FAQ'];

// The stack's own group link (VITE_SIMPLEX_GROUP_LINK in e2e/docker-compose.yml).
const GROUP_LINK = 'https://smp.e2e.test/g#catalog';

// The servers' page puts the filters it starts with in its address (US-B23): `/#/servers?filterStatus=true`.
const SERVERS = new RegExp(`^${WEBSITE}/#/servers(\\?.*)?$`);

test.describe('on a computer', () => {
  test.skip(({ isMobile }) => isMobile, 'a story of a computer');

  // US-A1
  test('the root of the website leads to the servers', async ({ page }) => {
    await page.goto(`${WEBSITE}/`);
    await expect(page).toHaveURL(SERVERS);
    await open(page, '/#/');
    await expect(page).toHaveURL(SERVERS);
    await expect(page.getByRole('heading', { name: '🌐 Servers Catalog' })).toBeVisible();
  });

  // US-A2
  test('the header of a computer: the logo, the menu, the chat link, the GitHub corner', async ({ page }) => {
    await open(page, '/#/faq');
    const header = page.getByRole('navigation');
    await expect(header.getByRole('link', { name: 'Back to Home' })).toHaveText('SimpleX Catalog');
    for (const item of MENU) await expect(header.getByRole('link', { name: item, exact: true })).toBeVisible();
    // The page the person is on is marked, and no other.
    await expect(header.getByRole('link', { name: '❓ FAQ' })).toHaveClass(/uk-active/);
    await expect(header.getByRole('link', { name: '🌐 Servers' })).not.toHaveClass(/uk-active/);
    await expect(header.getByRole('link', { name: '💬 Chat' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Join the group chat @ SimpleX!' })).toBeHidden();
    await expect(header.locator('iframe')).toBeHidden();
    await expect(page.getByRole('link', { name: 'View source on GitHub' })).toHaveAttribute('href', 'https://github.com/ed-asriyan/simplex-catalog-frontend');
    await expect(corner(page)).toBeVisible();
    await expect(header.getByRole('button', { name: 'Open menu' })).toBeHidden();
  });

  test.describe('on a wide computer', () => {
    test.use({ viewport: { width: 1600, height: 900 } });

    // US-A2
    test('the header of a wide computer: the join link and the sponsor buttons', async ({ page }) => {
      await open(page, '/#/faq');
      const header = page.getByRole('navigation');
      await expect(header.getByRole('link', { name: 'Join the group chat @ SimpleX!' })).toBeVisible();
      await expect(header.getByRole('link', { name: '💬 Chat' })).toBeHidden();
      await expect(header.locator('iframe[title="Sponsor ed-asriyan"]')).toBeVisible();
      await expect(header.getByRole('link', { name: 'Donate using Liberapay' })).toBeVisible();
      await looks(page, 'header-wide-computer');
    });

    // US-A11
    test('Join the group chat @ SimpleX! opens the catalog\'s group link in a new tab', async ({ page, context }) => {
      await stubOtherWebsites(context);
      await open(page, '/#/faq');
      const link = page.getByRole('navigation').getByRole('link', { name: 'Join the group chat @ SimpleX!' });
      await expect(link).toHaveAttribute('target', '_blank');
      expect(await opensTab(page, link)).toBe(GROUP_LINK);
    });

    // US-A13
    test('the sponsor buttons are in the header, not the footer, of a wide computer', async ({ page }) => {
      await open(page, '/#/faq');
      await expect(page.locator('.uk-section-secondary iframe')).toBeHidden();
      await expect(page.locator('.uk-section-secondary').getByRole('link', { name: 'Donate using Liberapay' })).toBeHidden();
    });
  });

  // US-A11
  test('💬 Chat opens the catalog\'s group link in a new tab', async ({ page, context }) => {
    await stubOtherWebsites(context);
    await open(page, '/#/faq');
    const link = page.getByRole('navigation').getByRole('link', { name: '💬 Chat' });
    await expect(link).toHaveAttribute('target', '_blank');
    expect(await opensTab(page, link)).toBe(GROUP_LINK);
  });

  // US-A5
  test('🌐 Servers in the menu opens /#/servers', async ({ page }) => {
    await open(page, '/#/faq');
    const item = page.getByRole('navigation').getByRole('link', { name: '🌐 Servers' });
    await item.click();
    await expect(page).toHaveURL(SERVERS);
    await expect(page.getByRole('heading', { name: '🌐 Servers Catalog' })).toBeVisible();
    await expect(item).toHaveClass(/uk-active/);
  });

  // US-A6
  test('🤖 Bots in the menu opens /#/bots', async ({ page }) => {
    await open(page, '/#/faq');
    const item = page.getByRole('navigation').getByRole('link', { name: '🤖 Bots' });
    await item.click();
    await expect(page).toHaveURL(new RegExp(`${WEBSITE}/#/bots`));
    await expect(page.getByRole('heading', { name: '🤖 Bots' })).toBeVisible();
    await expect(item).toHaveClass(/uk-active/);
  });

  // US-A7
  test('📡 Relays in the menu opens /#/relays', async ({ page }) => {
    await open(page, '/#/faq');
    const item = page.getByRole('navigation').getByRole('link', { name: '📡 Relays' });
    await item.click();
    await expect(page).toHaveURL(new RegExp(`${WEBSITE}/#/relays`));
    await expect(page.getByRole('heading', { name: '📡 Relays' })).toBeVisible();
    await expect(item).toHaveClass(/uk-active/);
  });

  // US-A8
  test('❓ FAQ in the menu opens /#/faq', async ({ page }) => {
    await open(page, '/#/servers');
    const item = page.getByRole('navigation').getByRole('link', { name: '❓ FAQ' });
    await item.click();
    await expect(page).toHaveURL(`${WEBSITE}/#/faq`);
    await expect(page.getByRole('heading', { name: '❓ FAQ' })).toBeVisible();
    await expect(item).toHaveClass(/uk-active/);
  });

  // US-A9
  for (const item of ['👥 Groups', '📢 Channels']) {
    test(`${item} in the menu opens the SimpleX directory in a new tab`, async ({ page, context }) => {
      await stubOtherWebsites(context);
      await open(page, '/#/faq');
      const link = page.getByRole('navigation').getByRole('link', { name: item });
      await expect(link).toHaveAttribute('target', '_blank');
      expect(await opensTab(page, link)).toBe('https://simplex.chat/directory/');
      await expect(page).toHaveURL(`${WEBSITE}/#/faq`);
    });
  }

  // US-A10
  test('🎨 Themes in the menu opens the SimpleX themes in a new tab', async ({ page, context }) => {
    await stubOtherWebsites(context);
    await open(page, '/#/faq');
    const link = page.getByRole('navigation').getByRole('link', { name: '🎨 Themes' });
    await expect(link).toHaveAttribute('target', '_blank');
    expect(await opensTab(page, link)).toBe('https://slcw.github.io/SimpleX-Themes/');
  });

  // US-A12
  test('the logo leads home and the GitHub corner opens the code in a new tab', async ({ page, context }) => {
    await stubOtherWebsites(context);
    await open(page, '/#/faq');
    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL(SERVERS);
    await expect(page.getByRole('link', { name: 'View source on GitHub' })).toHaveAttribute('target', '_blank');
    expect(await opensTab(page, corner(page))).toBe('https://github.com/ed-asriyan/simplex-catalog-frontend');
  });

  // US-A13
  test('the footer: the notices, the sponsor buttons, the credits', async ({ page }) => {
    await open(page, '/#/faq');
    const footer = page.locator('.uk-section-secondary.uk-text-small');
    await expect(footer).toContainText('The website is not affiliated with the SimpleX team. Content is contributed by anonymous users.');
    await expect(footer).toContainText('Servers, bots and relays that have been inactive for 90 days or more may be removed from the directory.');
    await expect(footer).toContainText('Powered by');
    for (const [name, href] of [
      ['SimpleX', 'https://simplex.chat'],
      ['Svelte', 'https://svelte.dev'],
      ['Supabase', 'https://supabase.com'],
      ['UIkit', 'https://getuikit.com'],
      ['Icons8', 'https://icons8.com'],
      ['Ed Asriyan', 'https://asriyan.me'],
    ]) {
      const link = footer.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAttribute('target', '_blank');
    }
    // On a computer that is not a wide one the sponsor buttons are in the footer.
    await expect(footer.locator('iframe[title="Sponsor ed-asriyan"]')).toHaveAttribute('src', 'https://github.com/sponsors/ed-asriyan/button');
    await expect(footer.getByRole('link', { name: 'Donate using Liberapay' })).toHaveAttribute('href', 'https://liberapay.com/ed-asriyan/donate');
  });
});

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'a story of a phone');

  // US-A3
  test('the header of a phone: the menu button, the logo, the GitHub corner', async ({ page }) => {
    await open(page, '/#/faq');
    const header = page.getByRole('navigation');
    await expect(header.getByRole('button', { name: 'Open menu' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Back to Home' })).toHaveText('SimpleX Catalog');
    await expect(page.getByRole('link', { name: 'View source on GitHub' })).toHaveAttribute('href', 'https://github.com/ed-asriyan/simplex-catalog-frontend');
    await expect(corner(page)).toBeVisible();
    for (const item of MENU) await expect(header.getByRole('link', { name: item, exact: true })).toBeHidden();
  });

  // US-A4, US-A15
  test('Open menu slides the menu in, and Close menu or a tap beside it closes it', async ({ page }) => {
    await open(page, '/#/faq');
    const menu = page.locator('#mobile-nav');
    await expect(menu).toBeHidden();
    await page.getByRole('button', { name: 'Open menu' }).click();
    for (const item of MENU) await expect(menu.getByRole('link', { name: item, exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Join the group chat @ SimpleX!' })).toBeVisible();
    await expect(menu.locator('iframe[title="Sponsor ed-asriyan"]')).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Donate using Liberapay' })).toBeVisible();
    // The items come in the order of the story, the join link after them.
    const order = await menu.getByRole('link').allTextContents();
    expect(order.map((t) => t.trim()).slice(0, 8)).toEqual([...MENU, 'Join the group chat @ SimpleX!']);
    // The pointer is taken off the menu, where the tap on Open menu left it over an item. The menu is a layer over
    // the page as tall as the window: it is taken as the window shows it, not as the whole page.
    await page.mouse.move(389, 843);
    await looks(page, 'menu-phone', [], true);

    await menu.getByRole('button', { name: 'Close menu' }).click();
    await expect(menu).toBeHidden();

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(menu).toBeVisible();
    await page.mouse.click(380, 600);
    await expect(menu).toBeHidden();
  });

  // US-A5, US-A8 as a phone does them: through the menu
  test('an item of the opened menu leads to its page', async ({ page }) => {
    await open(page, '/#/faq');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('#mobile-nav').getByRole('link', { name: '🌐 Servers' }).click();
    await expect(page).toHaveURL(SERVERS);
  });

  // US-A13
  test('on a phone the footer has no sponsor buttons', async ({ page }) => {
    await open(page, '/#/faq');
    const footer = page.locator('.uk-section-secondary.uk-text-small');
    await expect(footer).toContainText('The website is not affiliated with the SimpleX team.');
    await expect(footer.locator('iframe')).toBeHidden();
  });
});

// US-A14
test('the FAQ: the questions, with their answers open', async ({ page }) => {
  await open(page, '/#/faq');
  await expect(page.getByRole('heading', { name: '❓ FAQ' })).toBeVisible();

  for (const title of [
    'How to deploy your own server?',
    'How to deploy your own relay?',
    'How to create your own bot?',
    "I submitted a bot but it didn't appear",
  ]) {
    await expect(page.getByRole('button', { name: title, exact: true })).toHaveAttribute('aria-expanded', 'true');
  }

  await expect(page.getByText('There are several guides to deploy your own SMP and XFTP server:')).toBeVisible();
  const guide = (name: string, href: string) =>
    expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  await guide('Official guide: SMP', 'https://simplex.chat/docs/server.html');
  await guide('Official guide: XFTP', 'https://simplex.chat/docs/xftp-server.html');
  await guide('Unofficial guide: SMP & XFTP - one command with docker compose', 'https://github.com/ed-asriyan/simplex-servers-docker');
  await guide('Official guide: Relay', 'https://simplex.chat/docs/chat-relay.html');
  await guide('Official guide: Bot', 'https://github.com/simplex-chat/simplex-chat/tree/stable/bots#readme');
  await guide('ChatPeerType', 'https://github.com/simplex-chat/simplex-chat/blob/stable/bots/api/TYPES.md#chatpeertype');
  await guide('a bug report', 'https://github.com/ed-asriyan/simplex-catalog-bots-validator/issues/new');

  const steps = page.getByRole('region', { name: "I submitted a bot but it didn't appear" });
  await expect(steps).toContainText("Ensure that the bot's ChatPeerType is bot. If it's not set or is human, the bot won't appear.");
  await expect(page.getByText('Note: This prevents regular user contacts from appearing in the catalog.')).toBeVisible();
  await expect(page.getByText('Wait up to 12 hours for the bot to appear in the catalog.')).toBeVisible();
  await expect(page.getByText("If the bot hasn't appeared after 12 hours, check if the bot is online and the submitted contact link is active. If it's online and the contact link is active, please submit a bug report.")).toBeVisible();
  await looks(page, 'faq');
});
