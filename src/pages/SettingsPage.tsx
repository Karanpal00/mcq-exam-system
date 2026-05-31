import { useState, useRef } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useCloudSyncStore } from '../store/cloudSyncStore';
import { backupRepo } from '../db/repository';
import { useToastStore } from '../components/Common/Toast';
import { Sun, Moon, Monitor, Download, Upload, Trash2, Cloud, LogOut, RefreshCw } from 'lucide-react';
import Modal from '../components/Common/Modal';
import db from '../db/database';

export default function SettingsPage() {
  const { theme, setTheme } = useSettingsStore();
  const {
    user, status, error, lastSyncedAt, lastSummary, firebaseConfigured,
    signInWithGoogle, signOutCloud, syncNow, resetCloudCopy,
  } = useCloudSyncStore();
  const addToast = useToastStore(s => s.addToast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const handleExport = async () => {
    const data = await backupRepo.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcq-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Backup exported!', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = await backupRepo.importAll(text);
    if (result.success) {
      addToast('Backup restored successfully!', 'success');
    } else {
      addToast('Import failed: ' + result.error, 'error');
    }
  };

  const handleClearAll = async () => {
    await db.delete();
    setShowClearModal(false);
    addToast('All data cleared. Refreshing...', 'info');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Theme */}
      <div className="card mb-2">
        <div className="card-title mb-2">Appearance</div>
        <div className="form-group">
          <label className="form-label">Theme</label>
          <div className="flex gap-sm">
            {([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']] as const).map(([val, Icon, label]) => (
              <button key={val}
                className={`btn ${theme === val ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTheme(val)}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="card mb-2">
        <div className="card-title mb-2 flex items-center gap-sm"><Cloud size={18} /> Account & Cloud Sync</div>
        {!firebaseConfigured ? (
          <div>
            <p className="text-sm text-muted">Firebase is not configured yet. The app is running in guest mode and storing data only in this browser.</p>
            <div className="form-hint mt-1">Add the `VITE_FIREBASE_*` environment variables from `.env.example` on Vercel/Render to enable Google login and Firestore sync.</div>
          </div>
        ) : user ? (
          <div>
            <div className="flex items-center justify-between mb-1" style={{ flexWrap: 'wrap' }}>
              <div>
                <div className="font-semibold">{user.displayName || 'Signed in user'}</div>
                <div className="text-sm text-muted">{user.email}</div>
              </div>
              <span className={`sync-pill sync-${status}`}>{status}</span>
            </div>
            <div className="text-sm text-muted">
              Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not yet'}
              {lastSummary && ` • Pulled ${lastSummary.pulled}, pushed ${lastSummary.pushed}, deletes ${lastSummary.deleted}`}
            </div>
            {error && <div className="import-error mt-1">{error}</div>}
            <div className="flex gap-sm mt-2" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={syncNow} disabled={status === 'syncing'}>
                <RefreshCw size={16} /> Sync Now
              </button>
              <button className="btn btn-ghost" onClick={resetCloudCopy} disabled={status === 'syncing'}>
                Re-upload Local Data
              </button>
              <button className="btn btn-ghost" onClick={signOutCloud}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted">Continue as guest or sign in with Google to migrate this browser’s local data to Firestore.</p>
            <button className="btn btn-primary mt-1" onClick={signInWithGoogle}>
              Sign in with Google
            </button>
          </div>
        )}
      </div>

      {/* Backup & Restore */}
      <div className="card mb-2">
        <div className="card-title mb-2">Backup & Restore</div>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={16} /> Export Backup
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import Backup
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
        <div className="form-hint mt-1">Backup includes all tests, questions, attempts, and bookmarks</div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: 'var(--danger)' }}>
        <div className="card-title mb-2" style={{ color: 'var(--danger)' }}>Danger Zone</div>
        <button className="btn btn-danger" onClick={() => setShowClearModal(true)}>
          <Trash2 size={16} /> Clear All Data
        </button>
        <div className="form-hint mt-1">This will permanently delete everything</div>
      </div>

      <Modal open={showClearModal} onClose={() => setShowClearModal(false)} title="Clear All Data?"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowClearModal(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleClearAll}>Delete Everything</button>
        </>}>
        <p>This will permanently delete all tests, questions, attempts, and bookmarks. This cannot be undone.</p>
        <p className="text-sm text-muted mt-1">Consider exporting a backup first.</p>
      </Modal>
    </div>
  );
}
