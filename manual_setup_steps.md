# Manual Setup Steps for Cloud & Auth

This document outlines the tasks that **only you (the owner)** can perform via the Firebase Console and your hosting provider. These are prerequisite steps before the application's cloud features can function.

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**.
3. Enter a project name (e.g., `mcq-exam-system`) and follow the prompts to create it. (You can disable Google Analytics for now if you prefer).

### 2. Enable Authentication (Google Sign-In)
1. In the Firebase Console, go to **Build > Authentication** from the left sidebar.
2. Click **Get Started**.
3. Go to the **Sign-in method** tab.
4. Click **Add new provider** and select **Google**.
5. Toggle the **Enable** switch, provide a project support email (your email), and click **Save**.

### 3. Create a Firestore Database
1. Go to **Build > Firestore Database** from the left sidebar.
2. Click **Create database**.
3. Choose a location closest to your expected users (e.g., `asia-south1` for India).
4. Start in **Production mode** (This denies all reads/writes by default, which is safe. We will deploy the specific security rules from the code later).
9636748193
### 4. Register the Web App & Get API Keys
1. Go back to the **Project Overview** (click the home icon top-left, or go to Project settings).
2. Under the "Your apps" section, click the **Web icon (`</>`)** to add a new web app.
3. Register the app with a nickname (e.g., `mcq-web-app`). You don't need to set up Firebase Hosting.
4. Once registered, Firebase will show you a `firebaseConfig` object containing your keys.

### 5. Update Environment Variables
You need to copy the values from the `firebaseConfig` object into your environment variables.

1. **Locally (for your own testing)**: Create a `.env.local` file in the root of your project (copying from `.env.example`) and fill in the values:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

2. **Production Hosting (Vercel / Render)**: 
   * Go to your hosting provider's dashboard.
   * Navigate to your project's settings and find the **Environment Variables** section.
   * Add all six of the `VITE_FIREBASE_*` keys exactly as they appear in your local `.env` file.

---
**Once you have completed these steps, your Firebase infrastructure is ready!**
