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
- Optional Google login with Firebase Authentication and Firestore cloud sync.

## Question Format

```txt
[SECTION] Quantitative Aptitude

Q: What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
ANSWER: B
EXPLANATION: This is optional. 2+2 equals 4.
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

## Firebase Setup

The app works without Firebase in guest mode. To enable Google login and online save:

1. Create a Firebase project.
2. Add a Web app in Firebase project settings.
3. Enable Authentication > Sign-in method > Google.
4. Create a Firestore database.
5. Copy `.env.example` to `.env.local` and fill the `VITE_FIREBASE_*` values.
6. Add the same environment variables on Vercel or Render.

Suggested Firestore rules for authenticated per-user data:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Cloud data is stored under `users/{uid}` with subcollections for `tests`, `questionBank`, `attempts`, `bookmarks`, `settings`, and sync tombstones. The app uses local IndexedDB first, then background-syncs to Firestore.

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

Without Firebase env vars, all app data is stored in the browser with IndexedDB. With Firebase configured, the same local data syncs online after Google sign-in.
