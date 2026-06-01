import { useCloudSyncStore } from '../../store/cloudSyncStore';
import { AlertCircle, LogIn, LogOut, RefreshCw, CheckCircle, WifiOff } from 'lucide-react';
import { useState } from 'react';

export default function ProfileWidget() {
  const { user, status, error, signInWithGoogle, signOutCloud, syncNow, firebaseConfigured } = useCloudSyncStore();
  const [showModal, setShowModal] = useState(false);

  if (!firebaseConfigured) return null;

  // Not signed in: show a "Sign In" button instead of cloud icon
  if (!user) {
    return (
      <button
        className="btn btn-primary btn-sm profile-signin-btn"
        onClick={signInWithGoogle}
        title="Sign in with Google to sync your data"
      >
        <LogIn size={16} /> Sign In
      </button>
    );
  }

  // Signed in: show profile avatar
  const initials = (user.displayName || user.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusIndicatorClass = (() => {
    switch (status) {
      case 'synced': return 'indicator-synced';
      case 'syncing': return 'indicator-syncing';
      case 'error': return 'indicator-error';
      case 'offline': return 'indicator-offline';
      default: return 'indicator-default';
    }
  })();

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="profile-avatar-btn"
        title="Account & Sync Status"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Profile'}
            className="profile-avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="profile-avatar-initials">{initials}</span>
        )}
        <span className={`profile-status-dot ${statusIndicatorClass}`} />
      </button>

      {showModal && (
        <div className="profile-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button className="profile-modal-close" onClick={() => setShowModal(false)}>
              ×
            </button>

            {/* Avatar + info */}
            <div className="profile-modal-header">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  className="profile-modal-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="profile-modal-avatar-placeholder">{initials}</div>
              )}
              <div className="profile-modal-name">{user.displayName || 'Signed in user'}</div>
              <div className="profile-modal-email">{user.email}</div>
            </div>

            {/* Sync status */}
            <div className="profile-modal-status">
              <div className={`profile-sync-badge ${statusIndicatorClass}`}>
                {status === 'synced' && <><CheckCircle size={14} /> Synced</>}
                {status === 'syncing' && <><RefreshCw size={14} className="spin" /> Syncing...</>}
                {status === 'error' && <><AlertCircle size={14} /> Sync Error</>}
                {status === 'offline' && <><WifiOff size={14} /> Offline</>}
                {(status === 'guest' || status === 'disabled') && <><CheckCircle size={14} /> Ready</>}
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="profile-modal-error">
                <AlertCircle size={16} />
                <div>
                  <div className="profile-modal-error-title">Sync Failed</div>
                  <div className="profile-modal-error-msg">{error}</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="profile-modal-actions">
              <button
                className="btn btn-primary w-full justify-center"
                onClick={() => syncNow()}
                disabled={status === 'syncing'}
              >
                <RefreshCw size={16} /> Sync Now
              </button>
              <button
                className="btn btn-ghost w-full justify-center profile-signout-btn"
                onClick={() => { signOutCloud(); setShowModal(false); }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
