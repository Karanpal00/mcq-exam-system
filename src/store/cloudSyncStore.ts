import { create } from 'zustand';
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, type User,
} from 'firebase/auth';
import { firebaseConfigured, getFirebaseAuth } from '../services/firebase';
import { syncFirestoreUser, wipeCloudDataForUser, startRealtimeSync, stopRealtimeSync } from '../services/cloudSync';
import { CLOUD_SYNC_EVENT } from '../services/syncEvents';
import type { CloudSyncSummary } from '../types';

type CloudStatus = 'disabled' | 'guest' | 'offline' | 'syncing' | 'synced' | 'error';

interface CloudSyncStore {
  firebaseConfigured: boolean;
  user: User | null;
  status: CloudStatus;
  error: string | null;
  lastSyncedAt: string | null;
  lastSummary: CloudSyncSummary | null;
  initCloudSync: () => void;
  signInWithGoogle: () => Promise<void>;
  signOutCloud: () => Promise<void>;
  syncNow: () => Promise<void>;
  resetCloudCopy: () => Promise<void>;
}

let initialized = false;
let pendingSync: number | null = null;
let syncInFlight = false;

export const useCloudSyncStore = create<CloudSyncStore>((set, get) => ({
  firebaseConfigured,
  user: null,
  status: firebaseConfigured ? 'guest' : 'disabled',
  error: null,
  lastSyncedAt: null,
  lastSummary: null,

  initCloudSync: () => {
    if (initialized) return;
    initialized = true;

    const auth = getFirebaseAuth();
    if (!auth) {
      set({ status: 'disabled' });
      return;
    }

    onAuthStateChanged(auth, user => {
      set({ user, status: user ? navigator.onLine ? 'guest' : 'offline' : 'guest', error: null });
      if (user) {
        get().syncNow();
        if (navigator.onLine) {
          startRealtimeSync(user.uid, () => {
             // Optional: trigger local re-render if needed, or depend on Dexie live queries
          });
        }
      } else {
        stopRealtimeSync();
      }
    });

    // Handle redirect result (for mobile / popup-blocked fallback)
    getRedirectResult(auth).catch(() => {
      // Redirect result errors are non-fatal; user just stays logged out
    });

    window.addEventListener('online', () => {
      const user = get().user;
      if (user) {
        get().syncNow();
        startRealtimeSync(user.uid, () => {});
      }
      else set({ status: 'guest' });
    });
    window.addEventListener('offline', () => {
      if (get().user) {
        set({ status: 'offline' });
        stopRealtimeSync();
      }
    });
    window.addEventListener(CLOUD_SYNC_EVENT, () => {
      if (!get().user || !navigator.onLine) return;
      if (pendingSync) window.clearTimeout(pendingSync);
      pendingSync = window.setTimeout(() => get().syncNow(), 2500);
    });

    // Remove the 60s polling since we have realtime sync now
  },

  signInWithGoogle: async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase is not configured');

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      set({ status: 'syncing', error: null });
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      // If popup was blocked, cancelled, or cross-origin issue → fall back to redirect
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/unauthorized-domain' ||
        code === 'auth/internal-error'
      ) {
        try {
          await signInWithRedirect(auth, provider);
          // Page will redirect; no further code runs
          return;
        } catch (redirectErr) {
          set({ status: 'error', error: (redirectErr as Error).message });
          return;
        }
      }
      set({ status: 'error', error: (err as Error).message });
    }
  },

  signOutCloud: async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    stopRealtimeSync();
    set({ user: null, status: 'guest', error: null });
  },

  syncNow: async () => {
    const { user } = get();
    if (!firebaseConfigured) {
      set({ status: 'disabled' });
      return;
    }
    if (!user) {
      set({ status: 'guest' });
      return;
    }
    if (!navigator.onLine) {
      set({ status: 'offline' });
      return;
    }
    if (syncInFlight) return;
    try {
      syncInFlight = true;
      set({ status: 'syncing', error: null });
      const summary = await syncFirestoreUser(user.uid);
      set({
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        lastSummary: summary,
        error: null,
      });
    } catch (err) {
      set({ status: 'error', error: (err as Error).message });
    } finally {
      syncInFlight = false;
    }
  },

  resetCloudCopy: async () => {
    const user = get().user;
    if (!user) throw new Error('Sign in before resetting cloud data');
    set({ status: 'syncing', error: null });
    await wipeCloudDataForUser(user.uid);
    await syncFirestoreUser(user.uid);
    set({ status: 'synced', lastSyncedAt: new Date().toISOString() });
  },
}));
