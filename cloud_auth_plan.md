# Cloud & Auth Implementation Plan

This document outlines the remaining features for Cloud and Authentication in the MCQ Exam System, ordered by priority of completion, along with instructions on how to implement them. It also details the security measures needed to ensure data privacy.

## Remaining Tasks (In Order of Priority)

### 1. Firestore Security Rules (Critical for Data Privacy)
Currently, if someone gets the Firebase configuration, they might be able to read or write any data if the database is in "test mode". We must restrict data access strictly to the authenticated user.

*   **Status**: Not Implemented.
*   **How to do it**: 
    1. Initialize Firebase CLI in the project root: `firebase init firestore`.
    2. Create a `firestore.rules` file with the following rules:
       ```javascript
       rules_version = '2';
       service cloud.firestore {
         match /databases/{database}/documents {
           // Only allow users to access their own subcollections
           match /users/{userId}/{document=**} {
             allow read, write: if request.auth != null && request.auth.uid == userId;
           }
         }
       }
       ```
    3. Deploy the rules using `firebase deploy --only firestore:rules`.

### 2. Real-time Synchronization (Seamless Cloud)
Currently, syncing is triggered manually, on a timer, or when the window comes back online. For a truly "seamless" experience across multiple devices, we need real-time listeners.

*   **Status**: Partial (Polling-based).
*   **How to do it**:
    1. Update `src/services/cloudSync.ts` to implement `onSnapshot` listeners from Firebase Firestore.
    2. When the user logs in, attach a listener to `/users/{userId}/tests`, `/users/{userId}/questions`, etc.
    3. When changes are detected from the cloud (where `metadata.hasPendingWrites` is false to avoid echoing local writes), automatically push those updates to the local IndexedDB (`putLocal`).

### 3. Dedicated Authentication UI & Sync Indicators
Auth is currently buried in the Settings page. Users need clear visibility of their sync status and an easy way to log in from anywhere.

*   **Status**: Basic.
*   **How to do it**:
    1. Create a `ProfileWidget` or `SyncStatus` component in the main `AppLayout` header/sidebar.
    2. Show a small cloud icon: Green (Synced), Yellow/Spinning (Syncing), Gray/Slashed (Offline), or Red (Error).
    3. Clicking the widget should open a modal prompting the user to Sign In with Google if they aren't logged in, or showing their account details if they are.

### 4. Background Sync for Offline Mutations
If a user takes an exam offline and closes the tab before reconnecting, the data stays local. We can use Service Workers to ensure it syncs even if the tab is closed.

*   **Status**: Not Implemented (relies on active browser tab).
*   **How to do it**:
    1. Implement the [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API) in the Vite PWA plugin configuration.
    2. When a mutation happens offline, register a sync event: `navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-mcq-data'))`.
    3. The service worker will catch this event when the network is restored and trigger the push to Firestore.

### 5. Advanced Conflict Resolution
The current sync uses a simple "last write wins" strategy based on timestamps (`getRecordStamp(remote) > getRecordStamp(local)`). 

*   **Status**: Basic.
*   **How to do it**:
    1. Implement a more robust mechanism such as vector clocks, or prompt the user if a significant conflict occurs (e.g., a test was edited locally and remotely at the exact same time).
    2. For now, timestamp-based is usually sufficient for single-user scenarios, but field-level merging would be more seamless.

---

## Security Measures (Preventing Data Leaks)

To ensure no data (like user emails, test questions, or results) is leaked, the following measures must be strictly enforced:

1.  **Firestore Security Rules**: As detailed in Step 1, the `firestore.rules` are the primary defense. By strictly matching `request.auth.uid == userId`, it is cryptographically impossible for User A to read or modify User B's tests or results via the client SDK.
2.  **No Hardcoded Secrets**: Ensure `VITE_FIREBASE_*` variables are loaded only via environment files (`.env`). Note that Firebase client configs are *safe* to be public in the JS bundle, but the backend rules must be locked down.
3.  **Local IndexedDB Privacy**: Local data is stored in the browser's IndexedDB. This is secure from other websites due to the browser's Same-Origin Policy. However, it is vulnerable if someone else uses the same physical device. 
    *   *Measure*: Provide a "Sign Out & Clear Local Data" button for shared devices.
4.  **HTTPS / TLS Encryption**: Ensure the app is hosted on a secure HTTPS domain (e.g., Vercel or Render). This encrypts all data in transit between the user's browser and Firestore, preventing Man-in-the-Middle (MitM) attacks.
5.  **Data Sanitization**: The current `sanitizeForFirestore` function strips out undefined or recursive properties. This prevents malformed data injections from crashing the database or bypassing rules.
