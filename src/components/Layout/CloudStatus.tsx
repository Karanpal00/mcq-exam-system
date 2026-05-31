import { Cloud, CloudOff, RefreshCw, User } from 'lucide-react';
import { useCloudSyncStore } from '../../store/cloudSyncStore';

const statusCopy = {
  disabled: { label: 'Cloud disabled', className: 'sync-disabled' },
  guest: { label: 'Guest mode', className: 'sync-guest' },
  offline: { label: 'Offline', className: 'sync-offline' },
  syncing: { label: 'Syncing', className: 'sync-syncing' },
  synced: { label: 'Synced', className: 'sync-synced' },
  error: { label: 'Sync error', className: 'sync-error' },
};

export default function CloudStatus() {
  const { user, status, signInWithGoogle, signOutCloud, syncNow, firebaseConfigured } = useCloudSyncStore();
  const copy = statusCopy[status];

  return (
    <div className="cloud-status">
      <button
        className={`sync-pill ${copy.className}`}
        onClick={() => user ? syncNow() : signInWithGoogle()}
        disabled={!firebaseConfigured || status === 'syncing'}
        title={firebaseConfigured ? 'Click to sync or sign in' : 'Add Firebase env vars to enable cloud sync'}
      >
        {status === 'syncing' ? <RefreshCw size={14} className="spin" /> : status === 'offline' || status === 'disabled' ? <CloudOff size={14} /> : <Cloud size={14} />}
        {copy.label}
      </button>

      {user ? (
        <button className="btn btn-ghost btn-sm" onClick={signOutCloud} title={user.email || 'Signed in'}>
          <User size={14} /> {user.displayName?.split(' ')[0] || 'Account'}
        </button>
      ) : (
        <button className="btn btn-primary btn-sm" onClick={signInWithGoogle} disabled={!firebaseConfigured}>
          Sign in
        </button>
      )}
    </div>
  );
}
