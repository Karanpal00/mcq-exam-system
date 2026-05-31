# MCQ Exam System — Implementation Plan

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Build** | Vite | Fastest dev server, instant HMR |
| **UI** | React 18 | Component architecture for complex SPA |
| **Routing** | React Router v6 | Client-side navigation |
| **Storage** | Dexie.js (IndexedDB) | Handles 5000+ questions, structured queries |
| **Charts** | Chart.js + react-chartjs-2 | Score trends, analytics |
| **PDF** | pdf.js | Import question papers |
| **Styling** | Vanilla CSS + CSS Variables | Dark/light mode, full control |
| **Icons** | Lucide React | Modern, lightweight icons |

## Build Phases

### Phase 1: Core Platform
1. Project setup (Vite + React)
2. Database layer (Dexie.js schemas)
3. App shell (routing, layout, dark mode)
4. Dashboard page
5. Question import (text format parser)
6. Test creation flow
7. Exam screen (questions, navigation palette, timer)
8. Auto-save & exam recovery
9. Submit & results page
10. Attempt history

### Phase 2: Advanced Features
11. Question bank (independent from tests)
12. Tags & difficulty system
13. Study mode (instant answers, no timer)
14. Practice mode (random questions)
15. Smart retake (wrong/unanswered/marked only)
16. Bookmarks system
17. Full-screen exam mode

### Phase 3: Analytics & Modes  
18. Section-wise analytics
19. Weak areas analysis
20. Performance trends (charts)
21. Time analytics per question
22. Incorrect questions collection
23. Custom marking scheme

### Phase 4: Polish
24. Backup & restore (full DB export/import)
25. Export (JSON/TXT)
26. PDF import wizard
27. Answer key import
28. PWA support (offline)
29. Keyboard navigation
30. Mobile optimization

## Data Architecture (Dexie.js/IndexedDB)

```
tests: ++id, name, createdAt
sections: ++id, testId, name, order
questions: ++id, sectionId, testId, text, options, correctAnswer, difficulty, *tags
attempts: ++id, testId, startTime, endTime, score, status
answers: ++id, attemptId, questionId, selectedAnswer, timeSpent, isMarked, isBookmarked
bookmarks: ++id, questionId, folder
```

## File Structure

```
mcq-exam-system/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── db/
│   │   └── database.js          # Dexie schema
│   ├── hooks/
│   │   ├── useTimer.js
│   │   ├── useExam.js
│   │   └── useTheme.js
│   ├── utils/
│   │   ├── parser.js            # Text/PDF import
│   │   ├── analytics.js
│   │   └── export.js
│   ├── components/
│   │   ├── Layout/
│   │   ├── Dashboard/
│   │   ├── TestManager/
│   │   ├── QuestionImport/
│   │   ├── Exam/
│   │   ├── Results/
│   │   ├── QuestionBank/
│   │   └── Analytics/
│   └── pages/
│       ├── DashboardPage.jsx
│       ├── CreateTestPage.jsx
│       ├── ExamPage.jsx
│       ├── ResultPage.jsx
│       ├── HistoryPage.jsx
│       ├── QuestionBankPage.jsx
│       └── AnalyticsPage.jsx
```

## Additional Suggestion: User Accounts & Cloud Sync

### Add Google Authentication

Use:

- Firebase Authentication
- Google Sign-In

Why:
- Fastest implementation
- No password management
- Secure OAuth flow
- Works on desktop and mobile

---

### Add Cloud Storage

Store user data in:

- Firebase Firestore

Data synced:

- Tests
- Question Bank
- Attempts
- Bookmarks
- Analytics
- Settings

Why:
- User can continue on any device
- Automatic cloud backup
- No manual export/import required

---

### Sync Strategy

Local First Architecture:

IndexedDB
    ↓
Background Sync
    ↓
Firestore

Why:
- App remains fast
- Works offline
- Syncs automatically when internet returns

---

### User Experience

User logs in with Google.

Desktop:
- Create tests
- Take exams

Mobile:
- Continue same tests
- View history
- Practice mode

All data automatically synced.

---

### Additional Database Collections

users
tests
questionBank
attempts
bookmarks
settings

Each document contains:

userId

to ensure user data isolation.

---

### Add Sync Status Indicator

Show:

🟢 Synced

🟡 Syncing

🔴 Offline

Why:
- User always knows sync state
- Prevents confusion about saved data

---

### Add Conflict Resolution

If same test modified on two devices:

Use:

Last Updated Timestamp

Newest version wins.

Why:
- Simple and reliable
- Easy implementation

---

### Add Guest Mode

Allow:

Continue Without Login

Store data only in IndexedDB.

User can later:

"Link Google Account"

and migrate all local data to cloud.

Why:
- No login barrier
- Better onboarding

---

### Updated Recommended Stack

Frontend
---------
React 18
TypeScript
Vite
React Router

State
------
Zustand

Local Storage
-------------
Dexie.js (IndexedDB)

Authentication
--------------
Firebase Authentication
Google Login

Cloud Database
--------------
Firestore

Charts
-------
Chart.js

Import
------
PDF.js

Search
-------
Fuse.js

Performance
-----------
Web Workers
react-window

PWA
----
vite-plugin-pwa

Icons
-----
Lucide React

Styling
--------
CSS Variables

Hosting
--------
Vercel (Preferred)
or
Render

Reason:
- Vercel works extremely well with React/Vite SPAs.
- Firebase handles authentication and cloud storage.
- No PHP, MySQL, or server management required.
- Fully supports desktop + mobile sync.