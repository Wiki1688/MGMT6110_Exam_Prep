# MGMT6110 Exam Prep

A phone-and-laptop revision app for MGMT6110 Human-AI Collaboration (Quiz 4 on Wed 4 Nov 2026, Final on Thu 12 Nov 2026 1pm).

- Reads slides from `public/content/slides.json` at runtime. Add new material by editing JSON. No code change.
- Tracks per-slide **seen** / **mastered** and **bookmarks** (star) in the browser's localStorage. Export/import a JSON file to sync phone and laptop.
- Installable PWA (works offline after the first visit). Light/dark theme. Font size S/M/L/XL.
- Keyboard: `←` `→` move slides, `B` bookmark, `M` mastered, `Esc` back to Home. On the phone: swipe, or tap the left/right edge of the slide.

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
- Topic colours (keep consistent): T01 #2563EB, T02 #7C3AED, T03 #0891B2, T04 #0D9488, T05 #65A30D, T06 #CA8A04, T07 #EA580C, T08 #DC2626, T09 #DB2777, T10 #9333EA, T11 #4F46E5, T12 #0EA5E9, T13 #16A34A, T14 #F59E0B, T15 #64748B, T16 #111827.

Validate your JSON before pushing (for example paste it into jsonlint.com). If a file fails to load, Home shows a warning at the bottom.

`scripts/sync-content.sh` copies the master content folder (`/home/claude/mgmt6110/build/content`) into `public/content/`. Run `npm run sync-content` or `bash scripts/sync-content.sh /path/to/content`.

## 5. Sync progress between phone and laptop

Progress (seen, mastered, bookmarks, last slide) is stored per device. To move it:

1. On device A open **Settings → Export progress**. A file `mgmt6110-progress-….json` downloads.
2. Send that file to device B (AirDrop, WhatsApp, email to yourself, iCloud/Google Drive).
3. On device B open **Settings → Import progress**, choose **Merge** (keeps both sides) or **Replace**, and pick the file.

Do this in both directions whenever you switch devices.

## Project layout

```
index.html              app shell, title "MGMT6110 Exam Prep"
public/manifest.json    PWA manifest
public/sw.js            service worker (caches app shell + content)
public/content/         slides.json, index.json, extra/, img/
src/App.jsx             routing + theme
src/views/              Home, Topic (reader), Bookmarks, Search, Settings
src/components/         Slide renderer, nav, progress ring, icons
src/lib/                content loader/merger, localStorage store, dates, router
scripts/sync-content.sh copies master content into public/content
scripts/screenshots.cjs dev helper: renders icons + Playwright screenshots
vercel.json             SPA rewrite
```
