// Dev helper: renders PNG icons from icon.svg and takes screenshots of the production build.
// Usage: node scripts/screenshots.cjs  (expects `npx vite preview --port 4173` running)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.env.OUT || '/home/claude/mgmt6110/out/screens';
const BASE = 'http://localhost:4173';

(async () => {
  const browser = await chromium.launch();
  // icons
  const svg = fs.readFileSync(path.join(__dirname, '../public/icons/icon.svg'), 'utf8');
  for (const size of [192, 512]) {
    const p = await browser.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, `../public/icons/icon-${size}.png`), omitBackground: true });
    await p.close();
  }
  fs.mkdirSync(OUT, { recursive: true });
  const shots = [
    { name: 'home', url: '/' },
    { name: 'topic', url: '/topic/T08/3' },
    { name: 'topic-exam', url: '/topic/T13/4' },
    { name: 'bookmarks', url: '/bookmarks' },
    { name: 'settings', url: '/settings' },
  ];
  for (const [dev, vp, dark] of [['phone', { width: 390, height: 844 }, false], ['laptop', { width: 1280, height: 800 }, false], ['phone-dark', { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: dev.startsWith('phone'), hasTouch: dev.startsWith('phone'), colorScheme: dark ? 'dark' : 'light' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', dev, e.message));
    page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', dev, m.text()); });
    // seed some progress so the screens are not empty
    await page.goto(BASE + '/');
    await page.evaluate(() => {
      const now = Date.now();
      localStorage.setItem('mgmt6110-exam-prep', JSON.stringify({
        version: 1,
        seen: { 'T08-01': now, 'T08-02': now, 'T08-03': now, 'T12-01': now, 'T13-01': now, 'T13-02': now },
        mastered: { 'T08-01': true, 'T12-01': true },
        bookmarks: { 'T08-03': now, 'T12-01': now, 'T13-02': now },
        last: { topicId: 'T13', slideIndex: 1, ts: now },
        settings: { fontSize: 'M', theme: 'auto' },
      }));
    });
    for (const s of shots) {
      if (dark && !['home', 'topic'].includes(s.name)) continue;
      await page.goto(BASE + s.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      if (s.name === 'topic-exam') { await page.click('.opt >> nth=0'); await page.click('text=Reveal answer'); await page.waitForTimeout(300); }
      await page.screenshot({ path: path.join(OUT, `exam-prep-${dev}-${s.name}.png`), fullPage: false });
    }
    await ctx.close();
  }
  await browser.close();
  console.log('done');
})();
