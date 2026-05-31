# MCQ Exam System

Offline-first MCQ exam app built with Vite, React, TypeScript, Dexie/IndexedDB, Chart.js, and vanilla CSS.

## Features

- Create tests from pasted text, `.txt` files, and simple text-based PDFs.
- Import answer keys and preview questions before saving.
- Timed exam mode with autosave, recovery, palette navigation, marking, bookmarks, full-screen toggle, and keyboard shortcuts.
- Study mode with instant answer feedback and no timer.
- Practice mode for random filtered sets from the full question bank.
- Smart retakes for wrong, unanswered, and marked questions.
- Question bank with search, tags, difficulty editing, and filters.
- Attempt history, result review, section analytics, weak areas, score trends, time analytics, and incorrect-question collection.
- Backup/restore, per-test JSON/TXT export, PWA manifest, and service worker caching.

## Question Format

```txt
[SECTION] Quantitative Aptitude

Q: What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
ANSWER: B
```

Answer-key import supports:

```txt
Q1: B
Q2: C
3. A
```

## Local Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build
```

## Deploy

### Vercel

The repo includes `vercel.json`.

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

### Render

The repo includes `render.yaml` for a static site.

- Build command: `npm install && npm run build`
- Publish directory: `dist`

All app data is stored in the browser with IndexedDB, so no server database is required for Vercel or Render hosting.
