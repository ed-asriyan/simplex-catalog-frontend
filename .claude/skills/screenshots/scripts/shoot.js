#!/usr/bin/env node
// Screenshots of a running user interface, on a computer and on a phone.
//
// Usage: shoot.js <shots.json> <out dir>
// shots.json: [{ "name": "apply-dialog", "url": "http://localhost:8000/#…",
//                "steps": [{ "click": { "role": "button", "name": "Apply changes" } },
//                          { "fill": { "role": "textbox", "name": "…", "text": "…" } },
//                          { "press": "Escape" }, { "wait": 500 }],
//                "only": "phone" }]           // "computer", "phone", or both when absent
// Writes <out dir>/<name>-computer.png and <name>-phone.png (the whole page),
// and prints each file's path. Elements are found as a person finds them: by
// role and accessible name.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const VIEWPORTS = {
  computer: { width: 1280, height: 800 },
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

async function run(page, steps) {
  for (const step of steps || []) {
    const target = (s) => page.getByRole(s.role, { name: s.name, exact: true });
    if (step.click) await target(step.click).first().click();
    else if (step.fill) await target(step.fill).first().fill(step.fill.text);
    else if (step.select) await target(step.select).first().selectOption({ label: step.select.option });
    else if (step.press) await page.keyboard.press(step.press);
    else if (step.wait) await page.waitForTimeout(step.wait);
    await page.waitForTimeout(150);
  }
}

(async () => {
  const [shotsFile, outDir] = process.argv.slice(2);
  if (!shotsFile || !outDir) {
    console.error('usage: shoot.js <shots.json> <out dir>');
    process.exit(2);
  }
  const shots = JSON.parse(fs.readFileSync(shotsFile, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  let failed = 0;
  for (const shot of shots) {
    for (const [device, viewport] of Object.entries(VIEWPORTS)) {
      if (shot.only && shot.only !== device) continue;
      const { width, height, ...rest } = viewport;
      const context = await browser.newContext({ viewport: { width, height }, ...rest });
      const page = await context.newPage();
      const file = path.join(outDir, `${shot.name}-${device}.png`);
      try {
        await page.goto(shot.url, { waitUntil: 'networkidle' });
        await run(page, shot.steps);
        await page.screenshot({ path: file, fullPage: true });
        console.log(file);
      } catch (err) {
        failed += 1;
        console.error(`${shot.name} (${device}): ${err.message.split('\n')[0]}`);
      }
      await context.close();
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
