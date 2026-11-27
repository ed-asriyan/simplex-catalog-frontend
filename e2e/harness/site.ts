// The website as a person uses it: opening a page, answering the browser's
// dialogs (the website asks for what to add, and tells what happened, in them),
// following a link that opens another website, and what the clipboard holds.
import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { WEBSITE } from './stack';

export { WEBSITE };

/** Opens the page at `address`, `/#/servers`, as typing it in the address bar does. */
export async function open(page: Page, address: string) {
  await stubOtherWebsites(page.context());
  // A change of the address after # is not a new page: the website would keep
  // what it showed, so a page is always opened from a blank one.
  await page.goto('about:blank');
  await page.goto(`${WEBSITE}${address}`);
}

/** What the browser's dialogs said, in order, and what the person answered. */
export interface Dialogs {
  readonly seen: { type: string; message: string }[];
  /** The message of the next dialog of `type` not yet taken. */
  next(type: 'prompt' | 'alert' | 'confirm'): Promise<string>;
  /** Fails unless no dialog of `type` is shown in the next moments. */
  none(type: 'prompt' | 'alert' | 'confirm'): Promise<void>;
}

interface Listening {
  answers: { prompt?: string | null; confirm?: boolean };
  seen: { type: string; message: string }[];
}
const listening = new WeakMap<Page, Listening>();

/**
 * The person answers the website's dialogs: a prompt with `prompt` (or cancels it
 * with `null`), a confirmation with `confirm`; an alert is read and closed. What
 * was said before this call is not counted: each call starts a new record.
 */
export function answering(page: Page, answers: { prompt?: string | null; confirm?: boolean } = {}): Dialogs {
  let state = listening.get(page);
  if (!state) {
    const created: Listening = { answers, seen: [] };
    state = created;
    listening.set(page, created);
    page.on('dialog', async (d) => {
      created.seen.push({ type: d.type(), message: d.message() });
      if (d.type() === 'prompt') {
        if (created.answers.prompt === undefined || created.answers.prompt === null) await d.dismiss();
        else await d.accept(created.answers.prompt);
      } else if (d.type() === 'confirm') {
        if (created.answers.confirm === false) await d.dismiss();
        else await d.accept();
      } else {
        await d.accept();
      }
    });
  }
  state.answers = answers;
  state.seen = [];
  const mine = state;
  const seen = mine.seen;
  const taken: Record<string, number> = {};
  const ofType = (type: string) => seen.filter((s) => s.type === type);
  return {
    seen,
    async next(type) {
      const n = (taken[type] ?? 0) + 1;
      await expect.poll(() => ofType(type).length, { message: `a ${type} dialog` }).toBeGreaterThanOrEqual(n);
      taken[type] = n;
      return ofType(type)[n - 1].message;
    },
    async none(type) {
      await page.waitForTimeout(1500);
      expect(ofType(type).length, `no ${type} dialog`).toBe(taken[type] ?? 0);
    },
  };
}

/**
 * Presses `Add … anonymously` of the page the person is on, enters `value`, and
 * returns what the website asked and what it answered ("" for no answer).
 */
export async function add(page: Page, button: string, value: string): Promise<{ asked: string; told: string }> {
  const dialogs = answering(page, { prompt: value });
  await page.getByRole('button', { name: button, exact: true }).click();
  const asked = await dialogs.next('prompt');
  const told = await dialogs.next('alert');
  return { asked, told };
}

/** The contexts whose other websites are stubbed already. */
const stubbed = new WeakSet<BrowserContext>();

/**
 * Stands in for every website but the catalog's, which the stack does not reach: a page of one (a link opened, the
 * sponsor button's frame) is a blank page, and an image of one (the icons, the Liberapay button) is one grey image, so
 * a page shows the same every run; the world map is the stack's own (`stubMap`). Done once a context, by `open`.
 */
export async function stubOtherWebsites(context: BrowserContext) {
  if (stubbed.has(context)) return;
  stubbed.add(context);
  await stubMap(context);
  await context.route(
    (url) => url.hostname !== '127.0.0.1' && url.hostname !== 'localhost',
    (route) => {
      const type = route.request().resourceType();
      if (type === 'document') return route.fulfill({ contentType: 'text/html', body: '<title>another website</title>' });
      if (type === 'image') return route.fulfill({ contentType: 'image/png', body: GREY });
      // Whatever else is another route's (the world map's), or the network's.
      return route.fallback();
    },
  );
}

/** A grey pixel, which an image of another website is drawn as, at its own size. */
const GREY = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWM4ceLEfwAIDANY7Y81AQAAAABJRU5ErkJggg==', 'base64');

/** Clicks `target` and returns the address of the new tab it opens. */
export async function opensTab(page: Page, target: ReturnType<Page['locator']>): Promise<string> {
  const [tab] = await Promise.all([page.context().waitForEvent('page'), target.click()]);
  await tab.waitForLoadState('domcontentloaded');
  const url = tab.url();
  await tab.close();
  return url;
}

/** Lets the page read the clipboard, and what it copied. */
export async function clipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}
export async function allowClipboard(context: BrowserContext) {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
}

/**
 * The world map of the servers page is drawn from a file the website loads from a
 * CDN: the tests give it a map of their own with three countries, Germany, Japan and
 * Brazil, so it draws the same wherever the tests run. Returns the countries in the
 * order they are drawn.
 */
export const MAP_COUNTRIES = ['DE', 'JP', 'BR'] as const;
export async function stubMap(context: BrowserContext) {
  // The ring of a country goes clockwise, as the map's projection (d3) draws what is inside it.
  const square = (lon: number, lat: number) => [[lon, lat], [lon, lat + 8], [lon + 8, lat + 8], [lon + 8, lat], [lon, lat]];
  const topology = {
    type: 'Topology',
    objects: {
      countries: {
        type: 'GeometryCollection',
        geometries: [
          { type: 'Polygon', id: '276', arcs: [[0]] }, // Germany
          { type: 'Polygon', id: '392', arcs: [[1]] }, // Japan
          { type: 'Polygon', id: '076', arcs: [[2]] }, // Brazil
        ],
      },
    },
    arcs: [square(6, 47), square(130, 32), square(-56, -14)],
  };
  await context.route('**/countries-110m.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(topology) }));
}

/**
 * Types `text` into a filter as a person does, key by key: the website applies a
 * filter on the keys released, a moment after the last one, not on what is set.
 */
export async function typeInto(field: ReturnType<Page['locator']>, text: string) {
  await field.click();
  await field.press('ControlOrMeta+a');
  if (text === '') await field.press('Backspace');
  else await field.pressSequentially(text);
}

/** What the QR code the locator shows says, read from how it is drawn; `null` when it is no QR code. */
export async function qrText(qr: Locator): Promise<string | null> {
  const png = PNG.sync.read(await qr.screenshot());
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
}

/** A date and time as a timeline shows it: `Nov 27, 2026 12:01 AM`. */
export const DATE_TIME = /^[A-Z][a-z]{2} \d{1,2}, \d{4}\s+\d{1,2}:\d{2} [AP]M$/;

/** A value a run makes anew, masked on a screenshot, and the least width it takes there (`10em`). */
export type Masked = [Locator, string];

/**
 * Compares the page with its approved screenshot `<name>.png`: the whole page, or what the window shows when
 * `window` (a layer opened over the page as tall as the window). Each masked element is given its least width
 * first, more than its value can take, so it is as wide every run: its mask covers that value and no more, and
 * nothing beside it moves.
 */
export async function looks(page: Page, name: string, masked: Masked[] = [], window = false) {
  for (const [locator, width] of masked) {
    await locator.evaluateAll((elements, least) => {
      for (const element of elements as HTMLElement[]) {
        const display = getComputedStyle(element).display;
        if (display === 'inline') element.style.display = 'inline-block';
        if (display === 'block') element.style.width = 'max-content';
        element.style.minWidth = least;
      }
    }, width);
  }
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: !window, mask: masked.map(([locator]) => locator) });
}
