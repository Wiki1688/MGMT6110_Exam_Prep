// Playwright checks for the revision app v3 (T00 exam topic, Prof Roh's revision pack pages; progress NOT reset).
// Run: npx vite preview --port 4312 --strictPort &  then  PORT=4312 timeout 300 node scripts/test-v3.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 4312;
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS || '/home/claude/mgmt6110/out/screens/';
const IMP = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/content/important.json'), 'utf8'));
const PACK = IMP.groups[0];
const SLIDES = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/content/slides.json'), 'utf8'));
const T00 = SLIDES.topics.find((t) => t.id === 'T00');
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const on = (m, id) => { const v = (m || {})[id]; return v === true || typeof v === 'number' || !!(v && v.on); };

(async () => {
  const browser = await chromium.launch();
  try {
    for (const vp of [{ w: 385, h: 860, tag: 'cover', mobile: true }, { w: 785, h: 850, tag: 'inner' }, { w: 850, h: 785, tag: 'inner-land' }]) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2, isMobile: !!vp.mobile, hasTouch: true });
      const page = await ctx.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      if (vp.tag === 'cover') {
        // existing v2 progress must survive (only the quiz app is reset in v3)
        await page.goto(BASE + '/manifest.json');
        await page.evaluate(() => localStorage.setItem('mgmt6110-exam-prep', JSON.stringify({ v: 2, seen: { 'T01-01': 1793000000000 }, mastered: { 'T01-01': { on: true, at: 1793000000000 } }, bookmarks: { 'T08-05': { on: true, at: 1793000000001 } }, settings: { fontSize: 'M', theme: 'auto' } })));
      }
      await page.goto(BASE + '/');
      await page.waitForSelector('.topic-grid');
      if (vp.tag === 'cover') {
        const st = await page.evaluate(() => JSON.parse(localStorage.getItem('mgmt6110-exam-prep') || '{}'));
        check('revision progress is NOT reset (old bookmark + mastered kept)', on(st.bookmarks, 'T08-05') && on(st.mastered, 'T01-01'));
      }
      // T00 first on Home
      const first = await page.textContent('.topic-grid .topic-card >> nth=0');
      check(`${vp.tag}: T00 "The final exam: how it is marked" is the first topic`, first.includes('T00') && first.includes('The final exam: how it is marked'), first.slice(0, 80));
      check(`${vp.tag}: no horizontal scroll (home)`, await noHScroll(page));
      await page.screenshot({ path: SHOTS + `v3-rev-${vp.tag}-home.png` });
      await page.click('.topic-grid .topic-card >> nth=0');
      await page.waitForSelector('.reader');
      check(`${vp.tag}: T00 opens at slide 1 of ${T00.slides.length}`, (await page.getAttribute('.reader', 'data-slide')) === 'T00-01' && (await page.textContent('.counter')).trim() === `1 / ${T00.slides.length}`);
      check(`${vp.tag}: T00 slide 1 shows the Part A / Part B table`, (await page.textContent('.reader')).includes('Part A: multiple choice') && (await page.$$('.reader table tbody tr')).length === 3);
      await page.screenshot({ path: SHOTS + `v3-rev-${vp.tag}-t00.png` });
      await page.goto(BASE + '/topic/T00/2');
      await page.waitForSelector('.reader');
      check(`${vp.tag}: T00 slide 2 = the 4-point rubric (Define / Explain / Apply / Check)`, /Define it/.test(await page.textContent('.reader')) && /Say what to check/.test(await page.textContent('.reader')));
      await page.goto(BASE + '/topic/T00/3');
      await page.waitForSelector('.reader');
      check(`${vp.tag}: T00 slide 3 = temperature worked example`, /Define temperature/.test(await page.textContent('.reader')));
      await page.goto(BASE + '/topic/T00/6');
      await page.waitForSelector('.reader');
      check(`${vp.tag}: T00 last slide quotes 'Facts about products change'`, /Facts about products change every week/.test(await page.textContent('.reader')));
      check(`${vp.tag}: no horizontal scroll (T00 reader)`, await noHScroll(page));

      // Important: the revision-pack group first, with its notice
      await page.goto(BASE + '/important');
      await page.waitForSelector('[data-testid=imp-card]');
      const firstGroup = await page.textContent('.imp-group >> nth=0');
      check(`${vp.tag}: first gallery group is "Prof Roh's revision pack — key pages"`, firstGroup.includes("Prof Roh's revision pack — key pages"));
      check(`${vp.tag}: notice "For MGMT6110 class use only; do not circulate" visible`, await page.isVisible('.imp-group >> nth=0 >> [data-testid=imp-notice]') && (await page.textContent('[data-testid=imp-notice]')).includes('for MGMT6110 class use only; do not circulate'));
      const nPack = (await page.$$('.imp-group >> nth=0 >> [data-testid=imp-card]')).length;
      check(`${vp.tag}: pack group shows ${PACK.slides.length} pages`, nPack === PACK.slides.length, String(nPack));
      // every pack image is served as a JPEG < 450 KB, and the thumbnails decode
      const imgs = await page.evaluate(async (list) => Promise.all(list.map(async (u) => { const r = await fetch('/content/' + u); const b = await r.blob(); return { u, ok: r.ok, type: b.type, size: b.size }; })), PACK.slides.map((s) => s.image));
      check(`${vp.tag}: all pack images load (JPEG, < 450 KB)`, imgs.every((i) => i.ok && i.type === 'image/jpeg' && i.size < 450000), imgs.filter((i) => !i.ok || i.size >= 450000).map((i) => i.u).join(','));
      const thumbs = page.locator('.imp-group >> nth=0 >> .imp-thumb img');
      for (let i = 0; i < await thumbs.count(); i++) await thumbs.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const decoded = await page.$$eval('.imp-group:first-of-type .imp-thumb img', (els) => els.filter((e) => e.complete && e.naturalWidth >= 1000).length);
      check(`${vp.tag}: pack thumbnails decoded (1800 px wide)`, decoded === PACK.slides.length, `${decoded}/${PACK.slides.length}`);
      check(`${vp.tag}: no horizontal scroll (gallery)`, await noHScroll(page));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: SHOTS + `v3-rev-${vp.tag}-important.png` });
      // open p.4 in the viewer
      await page.goto(BASE + '/important/pack/2');
      await page.waitForSelector('.zoom-box img');
      await page.waitForFunction(() => document.querySelector('.zoom-box img').complete && document.querySelector('.zoom-box img').naturalWidth > 0);
      const vt = await page.textContent('.viewer');
      check(`${vp.tag}: viewer: p.4 with title, remember bullets and "class use only"`, vt.includes('What a full answer to a 4-point question does') && (await page.$$('.remember li')).length >= 3 && vt.includes('class use only'));
      if (vp.tag !== 'cover') {
        const v = await page.evaluate(() => ({ st: document.querySelector('.viewer-stage').getBoundingClientRect().right, rem: document.querySelector('.remember').getBoundingClientRect().left }));
        check(`${vp.tag}: viewer two-pane (image left, remember right)`, v.rem >= v.st - 1, JSON.stringify(v));
      }
      await page.screenshot({ path: SHOTS + `v3-rev-${vp.tag}-viewer.png` });
      check(`${vp.tag}: no page errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  } catch (e) {
    check('script error', false, e.stack);
  } finally {
    await browser.close();
    const fails = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - fails}/${results.length} passed`);
    process.exit(fails ? 1 : 0);
  }
})();
