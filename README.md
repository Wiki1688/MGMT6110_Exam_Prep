# MGMT6110 Exam Prep

A phone-and-laptop revision app for MGMT6110 Human-AI Collaboration. **Final exam: Thu 12 Nov 2026, 1 pm (Asia/Singapore).** Quiz 4 (4 Nov) is over, so its countdown is gone.

- Reads slides from `public/content/slides.json` at runtime. Add new material by editing JSON. No code change.
- Tracks per-slide **seen** / **mastered** and **bookmarks** (star) in the browser (localStorage + an IndexedDB copy). Back up / import a JSON file to sync phone and laptop.
- **Important slides** tab: a gallery of the must-know slide images with full-screen pinch/double-tap zoom.
- Installable PWA (works offline after the first visit). Light/dark theme. Font size S/M/L/XL.
- Keyboard: `←` `→` move slides, `B` bookmark, `M` mastered, `Esc` back to Home. On the phone: swipe, or tap the left/right edge of the slide.

> **Share the deployed app only within the class.** The *Prof Roh's revision pack — key pages* gallery shows pages of Prof Roh's Comprehensive Course Revision Pack, which says *"For MGMT 6110 in the MBAI programme use only. Do not circulate without the author's permission."* Keep the Vercel URL inside the MGMT6110 class (do not post it publicly); the gallery header repeats this notice.

## What changed in v3 (5 Nov 2026)

- **New first topic T00 "The final exam: how it is marked"** (colour #111827, 6 slides): the format (Part A 10 × 1, Part B 5 × 4), the 4-point rubric Define → Explain → Apply → Check with the temperature worked example (Quiz 1 Q5), where Part B answers lose points (pack p.152), how to revise (p.153), and "facts about products change every week … not what the exam tests". Edited in the shared source `/home/claude/mgmt6110/build/content/slides.json`, then synced (`npm run sync-content`). Slides may now carry an optional `source` line.
- **Important slides: new first group "Prof Roh's revision pack — key pages"** (16 pages: p.3 exam format, p.4 the 4-point answer, p.152 where points are lost, p.153 how to revise, p.6 course on one page, p.7 where the 40 questions came from, p.25/46/64/101 the four quiz "in a nutshell" tables, p.98 the harness (Quiz 4 Q8), p.114/132 studio nutshells, p.141 the Week 9 map with Muse / Zap / Run 4a-4b, p.143 co-collaboration principle, p.144 the five states). Images `public/content/important/pack-pNNN.jpg` (rendered at 150 dpi, 1800 px wide, < 450 KB), each with a title, 3–5 "Remember" bullets and a topic id. A group may carry a `notice`, shown under its heading (here: *"From Prof Roh's revision pack — for MGMT6110 class use only; do not circulate"*).
- **Progress is NOT reset** (only the quiz app starts fresh in v3). Service worker `VERSION` → `mgmt6110-v5-2026-11-05-pack`.
- Tests: `scripts/test-v3.cjs` (T00, pack group + notice, images, fold sizes, progress kept) and `scripts/test-v2.cjs` still pass. Run `npx vite preview --port 4312 --strictPort &` then `PORT=4312 timeout 300 node scripts/test-v3.cjs`.

## What changed in v2 (4 Nov 2026)

**Progress is safer**
- Every tap (seen, mastered, mark/star) is saved **at once**, and again when the app is hidden or closed.
- **Two windows no longer overwrite each other**: before writing, the app reads what is stored and merges slide by slide (each mark carries its own on/off time, the newest wins; "seen" is combined). Other open windows pick up the change straight away.
- Your **topic + slide** is kept in the address (`/topic/T08/5`), so a reload or a fold/unfold returns to the same slide; if Android closes the app and you reopen it from the home-screen icon within 12 hours, it goes straight back to that slide. Leaving the reader for Home turns this off.
- Every save is **mirrored to IndexedDB** and restored from there if localStorage is ever empty or corrupt.
- The app asks the phone not to clear its data (`navigator.storage.persist()`); Settings shows *Storage: protected* or *Storage: may be cleared by the phone*.
- **Back up now** in Settings (and a Home reminder once you have seen more than 20 slides and not backed up for 3 days).
- Import **merges by default**; *Replace* is the other choice. Old (format 1) files still import.

**Foldable layouts (Honor Magic V3)**
- Cover screen (≈ 385 × 860): compact header, big buttons, no sideways scrolling, sticky **Prev / Master / Mark / Next** bar.
- Inner screen (≈ 785 × 850 or 850 × 785): **two-column topic grid** on Home; the reader shows the **slide on the left** and **memorise line, exam tip, trap, your marked slides and the slide list on the right**; the Important viewer puts the "Remember" notes beside the image. Fold/unfold switches layout without losing your place.
- `dvh` units, `env(safe-area-inset-*)`, `viewport-fit=cover`; panes line up with a reported hinge (`horizontal-viewport-segments`) where supported. Smallest text size setting is now 17 px.

**Other**
- One countdown: **Final exam · Thu 12 Nov 2026 · 1 pm**, with an exam-day message.
- **Important slides** (new tab + Home card), see section 6.
- Service worker: content JSON is always fetched fresh (network-first, no-cache), a new deploy takes over immediately and the app shows **"New version available — tap to refresh"**. Manifest orientation is now `any` so the unfolded landscape screen works when installed.

## 1. Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve dist/ on http://localhost:4173
```

## 2. Deploy to GitHub + Vercel (no command line needed)

1. **Unzip** `MGMT6110_Exam_Prep_App.zip`. You get a folder `exam-prep-app/` with `index.html`, `package.json`, `public/`, `src/` and so on.
2. **Put it on GitHub.**
   - On github.com click **New** (new repository). Name it e.g. `mgmt6110-exam-prep`. Do not tick "Add a README". Click **Create repository**.
   - On the empty repo page click the link **"uploading an existing file"**.
   - Open the unzipped folder, select **everything inside it** (the contents, not the folder itself; never `node_modules`) and drag it into the browser.
   - Scroll down and click **Commit changes**.
3. **Deploy on Vercel.** Go to vercel.com → **Add New… → Project** → **Import** the `mgmt6110-exam-prep` repo → Framework Preset **Vite** (build `npm run build`, output `dist` are filled in for you) → **Deploy**. After about a minute you get a URL like `https://mgmt6110-exam-prep.vercel.app`.
4. **Update content later.** On github.com open `public/content/slides.json` (or any `public/content/*.json`) → pencil icon → edit → **Commit changes**. Vercel sees the commit and redeploys automatically in about a minute. New images go in `public/content/img/` via **Add file → Upload files**.

Command-line alternative (if you prefer git):

```bash
git init && git add . && git commit -m "MGMT6110 exam prep app"
git branch -M main
git remote add origin https://github.com/<you>/mgmt6110-exam-prep.git
git push -u origin main
```

`vercel.json` already contains the SPA rewrite so deep links such as `/topic/T13/4` work.

## 3. Add to your phone home screen

- **iPhone (Safari):** open the Vercel URL → tap the **Share** button → **Add to Home Screen** → **Add**.
- **Android (Chrome):** open the URL → menu (⋮) → **Add to Home screen** / **Install app**.

The app then opens full screen without the browser bar and keeps working offline.

## 4. Add new materials (e.g. Prof Roh's Week 10 slides)

Content lives in `public/content/`:

```
public/content/
  slides.json        the main deck (all topics)
  index.json         list of extra files to merge, e.g. ["week10.json"]
  extra/week10.json  an extra deck in the same format
  img/*.svg|png      images referenced by slides
```

**Option A – edit `slides.json` directly.** Add a topic or more slides to an existing topic.

**Option B – drop in a separate file (recommended for new weeks).**
1. Create `public/content/extra/week10.json` using the schema below.
2. Add its name to `public/content/index.json`: `["week10.json"]`.
3. Commit and push. Done.

Merge rules: a topic with a new `id` is appended; a topic with an existing `id` gets its slides appended (a slide with the same `id` replaces the old one, so you can fix a slide from an extra file). Topics are shown in `id` order (T01, T02, …).

### JSON schema (from the course build spec)

```json
{
  "version": "2026-11-01",
  "course": "MGMT6110 Human-AI Collaboration",
  "topics": [
    {
      "id": "T08", "title": "An Agent That Works While You Do Not", "week": "Week 6", "color": "#DC2626",
      "carry": "the one sentence to carry (slide wording)",
      "slides": [
        {
          "id": "T08-01",
          "title": "short title (<= 60 chars)",
          "kind": "concept | list | compare | diagram | example | exam | recap | memorise",
          "body": ["bullet 1 (<= 110 chars)", "bullet 2"],
          "table": { "headers": ["A","B"], "rows": [["x","y"]] },
          "image": "img/T08-loop.svg",
          "tip": "exam tip (optional)",
          "trap": "trap (optional)",
          "memorise": "the exact line/number to memorise (optional)"
        }
      ]
    }
  ]
}
```

Field notes:
- `kind` changes how the slide is drawn. `compare` needs `table`; `diagram` needs `image` (path relative to `public/content/`, e.g. `img/T08-loop.svg`); `memorise` puts the `memorise` line in a big box.
- `exam` slides are MCQs: put the question in `body`, add `"options": ["A…","B…","C…","D…"]`, `"answer": 1` (0-based index) and an optional `"explanation"`.
- `body`, `table`, `image`, `tip`, `trap`, `memorise` are all optional on every kind.
- Topic colours (keep consistent): T01 #2563EB, T02 #7C3AED, T03 #0891B2, T04 #0D9488, T05 #65A30D, T06 #CA8A04, T07 #EA580C, T08 #DC2626, T09 #DB2777, T10 #9333EA, T11 #4F46E5, T12 #0EA5E9, T13 #16A34A, T14 #F59E0B, T15 #64748B, T16 #111827, T17 #BE185D, T18 #0F766E, T19 #B45309.

Validate your JSON before pushing (for example paste it into jsonlint.com). If a file fails to load, Home shows a warning at the bottom.

`scripts/sync-content.sh` copies the master content folder (`/home/claude/mgmt6110/build/content`) into `public/content/`. Run `npm run sync-content` or `bash scripts/sync-content.sh /path/to/content`. It never overwrites `important.json` or `important/`, which are curated inside the app.

## 5. Back up, restore and sync progress

Progress (seen, mastered, marks, important-slide stars, last slide) is stored on each device (localStorage key `mgmt6110-exam-prep`, mirrored to IndexedDB).

1. On device A open **Settings → Back up now**. A file `mgmt6110-exam-prep-backup-….json` downloads (export **format 2**).
2. Send that file to device B (WhatsApp, email to yourself, Google Drive).
3. On device B open **Settings → Import a backup**. **Merge** is the default: the newest mark for each slide wins and "seen" is combined, so nothing is lost and importing twice changes nothing. **Replace** makes device B exactly match the file (asks to confirm).

Format-1 files from v1 (`mastered: {id: true}`, `bookmarks: {id: timestamp}`) are still accepted. In v2 the stored shape is `mastered/bookmarks: {id: {on, at}}`, `seen: {id: firstSeenTime}`, plus `backupAt` and `epoch` (changes on Reset/Replace so other windows follow).

*Storage: protected* in Settings means the browser has agreed not to clear the data; *may be cleared by the phone* means back up now and then (installing to the home screen usually upgrades this).

## 6. Important slides (gallery + zoom viewer)

The **Important** tab (and the Home card) reads `public/content/important.json`:

```json
{
  "groups": [
    {
      "id": "week9", "title": "Week 9 · Mapping the Territory", "week": "Week 9",
      "notice": "optional line shown under the heading (e.g. a class-use-only notice)",
      "slides": [
        {
          "id": "six-questions",
          "image": "important/w9-six-questions.jpg",
          "title": "Q1–Q6: the six questions",
          "remember": ["Six questions place any agent on the map.", "The gate moves to before the action."],
          "topic": "T13"
        }
      ]
    }
  ]
}
```

How to add the real slides:
1. Export each slide as a JPG/PNG (1600 px wide is plenty) and put the files in `public/content/important/`.
2. Edit `public/content/important.json`: one group per week/theme, one entry per slide. `image` is relative to `public/content/`. `id` must be unique and should not change later (stars and "seen" are stored against it, as `imp:<id>`). `topic` (e.g. `T10`) colours the card and adds an "Open T10" link. `remember` is a list of short lines shown under (cover) or beside (unfolded) the image.
3. Commit. (v2.1 ships 24 real slides: the student's selection from Weeks 7–9 plus ten Week 10 Co-Collaboration Model slides.)

In the viewer: **pinch** or **double-tap** to zoom (up to 5×), drag to pan, double-tap again to reset, **swipe** or `←` `→` for the next slide, the **star** to keep it (it then also appears on the Marked page), `Esc` to close. On a laptop, Ctrl/⌘ + mouse wheel zooms and the − / + buttons work everywhere. If `important.json` is missing the tab just shows an empty state.

## Project layout

```
index.html              app shell, title "MGMT6110 Exam Prep"
public/manifest.json    PWA manifest
public/sw.js            service worker (network-first content, refresh toast; bump VERSION per release)
public/content/         slides.json, index.json, extra/, img/, important.json, important/
src/App.jsx             routing + theme
src/views/              Home, Topic (reader), Important (gallery + viewer), Bookmarks, Search, Settings
src/components/         Slide renderer, ZoomImage (pinch/double-tap zoom), UpdateToast, nav, progress ring, icons
src/lib/                content loader/merger, store (merge-safe, IndexedDB mirror), idb, useMedia (foldable layouts), dates, router
scripts/sync-content.sh copies master content into public/content
scripts/screenshots.cjs dev helper: renders icons + Playwright screenshots
vercel.json             SPA rewrite + no-cache headers for content and sw.js
```
