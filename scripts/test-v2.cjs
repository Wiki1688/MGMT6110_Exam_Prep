// Playwright checks for the revision app (served by vite preview on PORT).
const { chromium } = require('playwright');
const fs = require('fs');
const PORT = process.env.PORT || 4302;
const BASE = `http://localhost:${PORT}`;
const SHOTS = '/home/claude/mgmt6110/out/screens/';
const SCR = require('os').tmpdir() + '/';
const IMP = JSON.parse(fs.readFileSync(__dirname + '/../public/content/important.json', 'utf8'));
const IMP_IDS = IMP.groups.flatMap((g) => g.slides.map((x) => x.id));
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mgmt6110-exam-prep') || '{}'));
const on = (m, id) => { const v = (m || {})[id]; return v === true || typeof v === 'number' || !!(v && v.on); };

async function nextSlide(page) {
  const before = await page.getAttribute('.reader', 'data-index');
  await page.click('button[aria-label="Next slide"]');
  await page.waitForFunction((b) => document.querySelector('.reader')?.getAttribute('data-index') !== b, before);
}

(async () => {
  const browser = await chromium.launch();
  try {
    // ---------- cover screen ----------
    const ctx = await browser.newContext({ viewport: { width: 385, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + '/');
    await page.waitForSelector('.topic-grid');
    const cd = await page.textContent('[data-testid=countdown]');
    check('cover: one countdown, final exam only', cd.includes('Final exam') && cd.includes('12 Nov') && !/Quiz 4/i.test(cd) && (await page.$$('.chips .chip')).length === 1, cd);
    check('cover: Important slides card on Home', await page.isVisible('[data-testid=imp-home]'));
    check('cover: no horizontal scroll (home)', await noHScroll(page));
    await page.screenshot({ path: SHOTS + 'v2-rev-cover-home.png' });
    await page.click('.topic-card:has-text("T08")');
    await page.waitForSelector('.reader');
    for (let i = 0; i < 4; i++) await nextSlide(page);
    check('cover: on slide 5', (await page.getAttribute('.reader', 'data-index')) === '4' && page.url().endsWith('/topic/T08/5'), page.url());
    const slideId = await page.getAttribute('.reader', 'data-slide');
    await page.click('.foot-actions .pill.star');
    let st = await store(page);
    check('bookmark saved at once as {on, at}', on(st.bookmarks, slideId) && typeof st.bookmarks[slideId].at === 'number');
    check('cover: sticky Prev/Next bar visible', await page.isVisible('.reader-foot button[aria-label="Next slide"]'));
    check('cover: no horizontal scroll (reader)', await noHScroll(page));
    await page.screenshot({ path: SHOTS + 'v2-rev-cover-reader.png' });
    await page.reload();
    await page.waitForSelector('.reader');
    check('reload restores topic + slide 5', (await page.getAttribute('.reader', 'data-slide')) === slideId);
    check('reload keeps the bookmark', await page.isVisible('.foot-actions .pill.star.on'));
    // relaunch from the home-screen icon ("/") reopens the reader
    await page.goto(BASE + '/');
    await page.waitForSelector('.reader', { timeout: 10000 }).catch(() => {});
    check('relaunch at "/" reopens the reader at the same slide', (await page.getAttribute('.reader', 'data-slide').catch(() => null)) === slideId, page.url());
    await page.click('button[aria-label="Back to home"]');
    await page.waitForSelector('.topic-grid');
    await page.goto(BASE + '/');
    await page.waitForSelector('.topic-grid');
    check('after leaving the reader, "/" stays on Home', !(await page.$('.reader')));

    // Important slides
    await page.click('.nav-btn:has-text("Important")');
    await page.waitForSelector('[data-testid=imp-card]');
    const nCards = (await page.$$('[data-testid=imp-card]')).length;
    check('important gallery lists every slide in important.json', nCards === IMP_IDS.length, `${nCards} of ${IMP_IDS.length}`);
    await page.screenshot({ path: SHOTS + 'v2-rev-cover-important.png' });
    await page.click('[data-testid=imp-card] >> nth=0');
    await page.waitForSelector('.zoom-box img');
    await page.waitForFunction(() => document.querySelector('.zoom-box img').complete);
    check('viewer opens at scale 1', (await page.getAttribute('.zoom-box', 'data-scale')) === '1.00');
    const box = await page.$('.zoom-box');
    const bb = await box.boundingBox();
    const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    await page.mouse.click(cx, cy); await page.waitForTimeout(80); await page.mouse.click(cx, cy);
    await page.waitForTimeout(100);
    const s1 = await page.getAttribute('.zoom-box', 'data-scale');
    check('double-tap zooms in (scale changes)', Number(s1) > 2, `scale ${s1}`);
    // pan while zoomed
    const tr0 = await page.$eval('.zoom-box img', (i) => i.style.transform);
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx - 60, cy - 30, { steps: 5 }); await page.mouse.up();
    const tr1 = await page.$eval('.zoom-box img', (i) => i.style.transform);
    check('drag pans the zoomed image', tr0 !== tr1, `${tr0} -> ${tr1}`);
    await page.screenshot({ path: SHOTS + 'v2-rev-cover-viewer-zoomed.png' });
    await page.mouse.click(cx, cy); await page.waitForTimeout(80); await page.mouse.click(cx, cy);
    await page.waitForTimeout(100);
    check('double-tap again resets to 1', (await page.getAttribute('.zoom-box', 'data-scale')) === '1.00');
    // two-finger pinch with synthetic pointer events (touch)
    const pinch = await page.evaluate(({ cx, cy }) => {
      const el = document.querySelector('.zoom-box');
      const fire = (type, id, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: id === 1 }));
      fire('pointerdown', 11, cx - 20, cy); fire('pointerdown', 12, cx + 20, cy);
      for (let k = 1; k <= 5; k++) { fire('pointermove', 11, cx - 20 - k * 10, cy); fire('pointermove', 12, cx + 20 + k * 10, cy); }
      fire('pointerup', 11, cx - 70, cy); fire('pointerup', 12, cx + 70, cy);
      return true;
    }, { cx: cx - bb.x + bb.x, cy });
    await page.waitForTimeout(100);
    const s2 = Number(await page.getAttribute('.zoom-box', 'data-scale'));
    check('pinch (two pointers) zooms in', pinch && s2 > 2.5, `scale ${s2}`);
    await page.click('[data-testid=imp-star]');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.viewer-count')?.textContent.startsWith('2/'));
    check('arrow key moves to the next important slide and resets zoom', (await page.getAttribute('.zoom-box', 'data-scale')) === '1.00');
    await page.reload();
    await page.waitForSelector('.viewer-count');
    check('viewer reload stays on the same important slide', (await page.textContent('.viewer-count')).startsWith('2/'));
    st = await store(page);
    check('important star + seen persisted', on(st.bookmarks, 'imp:' + IMP_IDS[0]) && !!st.seen['imp:' + IMP_IDS[0]] && !!st.seen['imp:' + IMP_IDS[1]]);
    check('no page errors (cover)', errors.length === 0, errors.join(' | '));

    // two windows: bookmark different slides in each, reload both
    const pA = page; const pB = await ctx.newPage();
    await pA.goto(BASE + '/topic/T02/2'); await pB.goto(BASE + '/topic/T03/3');
    await pA.waitForSelector('.reader'); await pB.waitForSelector('.reader');
    const idA = await pA.getAttribute('.reader', 'data-slide'), idB = await pB.getAttribute('.reader', 'data-slide');
    await pA.click('.foot-actions .pill.star');
    await pB.click('.foot-actions .pill.star');
    await pA.click('.foot-actions .pill:not(.star)'); // mastered after B wrote
    await pA.reload(); await pB.reload();
    await pA.waitForSelector('.reader'); await pB.waitForSelector('.reader');
    const sa = await store(pA), sb = await store(pB);
    check('two windows: both bookmarks present after reload', on(sa.bookmarks, idA) && on(sa.bookmarks, idB) && on(sb.bookmarks, slideId) && on(sa.mastered, idA));
    await pA.goto(BASE + '/bookmarks'); await pA.waitForSelector('.page-title');
    check('two windows: Marked page lists slides from both', (await pA.textContent('.page-title .count')).trim() === '4', await pA.textContent('.page-title .count'));
    await ctx.close();

    // ---------- inner screens ----------
    const old = { seen: { 'T01-01': 1793000000000, 'T01-02': 1793000000001 }, mastered: { 'T01-01': true }, bookmarks: { 'T01-02': 1793000000002 }, last: null, settings: { fontSize: 'M', theme: 'auto' } };
    fs.writeFileSync(SCR + 'rev-format1.json', JSON.stringify(old));
    for (const vp of [{ w: 785, h: 850, tag: 'inner' }, { w: 850, h: 785, tag: 'inner-land' }]) {
      const c = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2, hasTouch: true });
      const pg = await c.newPage();
      await pg.emulateMedia({ reducedMotion: 'reduce' });
      const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message));
      await pg.goto(BASE + '/');
      await pg.waitForSelector('.topic-grid');
      const cols = await pg.evaluate(() => getComputedStyle(document.querySelector('.topic-grid')).gridTemplateColumns.split(' ').length);
      check(`${vp.tag}: two-column topic grid on home`, cols === 2, `${cols} columns`);
      check(`${vp.tag}: no horizontal scroll`, await noHScroll(pg));
      await pg.screenshot({ path: SHOTS + `v2-rev-${vp.tag}-home.png` });
      await pg.goto(BASE + '/topic/T13/3');
      await pg.waitForSelector('.reader-aside');
      const r = await pg.evaluate(() => ({ s: document.querySelector('.reader').getBoundingClientRect().right, a: document.querySelector('.reader-aside').getBoundingClientRect().left }));
      check(`${vp.tag}: reader two-pane (slide left, notes right)`, r.a >= r.s, JSON.stringify(r));
      const t13 = await pg.getAttribute('.reader', 'data-slide');
      await pg.click('.foot-actions .pill.star');
      check(`${vp.tag}: aside lists the marked slide`, (await pg.textContent('.reader-aside')).includes('Marked in T13 (1)'));
      await pg.screenshot({ path: SHOTS + `v2-rev-${vp.tag}-reader.png` });
      // fold to cover: same slide, single column
      await pg.setViewportSize({ width: 385, height: 860 });
      await pg.waitForTimeout(250);
      check(`${vp.tag}: fold keeps slide and drops the side panel`, pg.url().endsWith('/topic/T13/3') && !(await pg.$('.reader-aside')));
      await pg.setViewportSize({ width: vp.w, height: vp.h });
      await pg.goto(BASE + '/important/week9/1');
      await pg.waitForSelector('.zoom-box img');
      const v = await pg.evaluate(() => ({ st: document.querySelector('.viewer-stage').getBoundingClientRect().right, rem: document.querySelector('.remember').getBoundingClientRect().left }));
      check(`${vp.tag}: viewer shows "remember" notes beside the image`, v.rem >= v.st - 1, JSON.stringify(v));
      await pg.screenshot({ path: SHOTS + `v2-rev-${vp.tag}-viewer.png` });
      // settings: storage status + import format 1 (merge)
      await pg.goto(BASE + '/settings');
      await pg.waitForSelector('[data-testid=persist-status]');
      await pg.waitForFunction(() => !document.querySelector('[data-testid=persist-status]').textContent.includes('checking'));
      check(`${vp.tag}: storage status shown`, /Storage: (protected|may be cleared by the phone)/.test(await pg.textContent('[data-testid=persist-status]')), await pg.textContent('[data-testid=persist-status]'));
      await pg.setInputFiles('[data-testid=import-input]', SCR + 'rev-format1.json');
      await pg.waitForSelector('.notice');
      const s = await store(pg);
      check(`${vp.tag}: format-1 import merges (old marks kept, new mark kept)`, on(s.mastered, 'T01-01') && on(s.bookmarks, 'T01-02') && on(s.bookmarks, t13) && s.bookmarks['T01-02'].at === 1793000000002, (await pg.textContent('.notice')));
      await pg.evaluate(() => localStorage.clear());
      await pg.reload();
      await pg.waitForSelector('.page-title');
      const s2 = await store(pg);
      check(`${vp.tag}: restore from IndexedDB after localStorage wiped`, on(s2.bookmarks, t13) && on(s2.mastered, 'T01-01'));
      check(`${vp.tag}: no page errors`, errs.length === 0, errs.join(' | '));
      await c.close();
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
