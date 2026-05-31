export const CLOUD_SYNC_EVENT = 'mcq-cloud-sync-requested';

export function requestCloudSync() {
  window.dispatchEvent(new Event(CLOUD_SYNC_EVENT));
}
