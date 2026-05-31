import {
  collection, deleteDoc, doc, getDocs, setDoc, writeBatch,
  type DocumentData, type Firestore,
} from 'firebase/firestore';
import db from '../db/database';
import type {
  AppSettings, Attempt, Bookmark, CloudCollectionName, CloudSyncSummary,
  Question, SyncTombstone, Test,
} from '../types';
import { getFirebaseDb } from './firebase';

type SyncRecord = Test | Question | Attempt | Bookmark | AppSettings;
type TableName = 'tests' | 'questions' | 'attempts' | 'bookmarks' | 'settings';

interface CollectionConfig<T extends SyncRecord> {
  cloudName: CloudCollectionName;
  tableName: TableName;
  readLocal: () => Promise<T[]>;
  putLocal: (record: T) => Promise<unknown>;
  deleteLocal: (id: number) => Promise<void>;
  getLocal: (id: number) => Promise<T | undefined>;
}

const COLLECTIONS: CollectionConfig<SyncRecord>[] = [
  {
    cloudName: 'tests',
    tableName: 'tests',
    readLocal: () => db.tests.toArray(),
    putLocal: record => db.tests.put(record as Test),
    deleteLocal: id => db.tests.delete(id),
    getLocal: id => db.tests.get(id),
  },
  {
    cloudName: 'questionBank',
    tableName: 'questions',
    readLocal: () => db.questions.toArray(),
    putLocal: record => db.questions.put(record as Question),
    deleteLocal: id => db.questions.delete(id),
    getLocal: id => db.questions.get(id),
  },
  {
    cloudName: 'attempts',
    tableName: 'attempts',
    readLocal: () => db.attempts.toArray(),
    putLocal: record => db.attempts.put(record as Attempt),
    deleteLocal: id => db.attempts.delete(id),
    getLocal: id => db.attempts.get(id),
  },
  {
    cloudName: 'bookmarks',
    tableName: 'bookmarks',
    readLocal: () => db.bookmarks.toArray(),
    putLocal: record => db.bookmarks.put(record as Bookmark),
    deleteLocal: id => db.bookmarks.delete(id),
    getLocal: id => db.bookmarks.get(id),
  },
  {
    cloudName: 'settings',
    tableName: 'settings',
    readLocal: () => db.settings.toArray(),
    putLocal: record => db.settings.put(record as AppSettings),
    deleteLocal: id => db.settings.delete(id),
    getLocal: id => db.settings.get(id),
  },
];

export async function syncFirestoreUser(userId: string): Promise<CloudSyncSummary> {
  const firestore = getFirebaseDb();
  if (!firestore) throw new Error('Firebase is not configured');

  let pulled = 0;
  let pushed = 0;
  let deleted = 0;

  await setDoc(doc(firestore, 'users', userId), {
    userId,
    lastSeenAt: new Date().toISOString(),
  }, { merge: true });

  const tombstoneDeletes = await applyRemoteTombstones(firestore, userId);
  deleted += tombstoneDeletes;

  for (const config of COLLECTIONS) {
    pulled += await pullCollection(firestore, userId, config);
  }

  for (const config of COLLECTIONS) {
    pushed += await pushCollection(firestore, userId, config);
  }

  const tombstonePushes = await pushTombstones(firestore, userId);
  deleted += tombstonePushes;

  return { pulled, pushed, deleted };
}

async function pullCollection(
  firestore: Firestore,
  userId: string,
  config: CollectionConfig<SyncRecord>,
) {
  const snapshot = await getDocs(collection(firestore, 'users', userId, config.cloudName));
  let pulled = 0;

  for (const remoteDoc of snapshot.docs) {
    const remote = fromCloudRecord(remoteDoc.data());
    if (!remote.id) continue;

    const local = await config.getLocal(remote.id);
    if (!local || getRecordStamp(remote) > getRecordStamp(local)) {
      await config.putLocal(remote);
      pulled++;
    }
  }

  return pulled;
}

async function pushCollection(
  firestore: Firestore,
  userId: string,
  config: CollectionConfig<SyncRecord>,
) {
  const records = await config.readLocal();
  let pushed = 0;

  for (const chunk of chunkArray(records, 350)) {
    const batch = writeBatch(firestore);
    for (const record of chunk) {
      if (!record.id) continue;
      const ref = doc(firestore, 'users', userId, config.cloudName, String(record.id));
      batch.set(ref, toCloudRecord(record, userId), { merge: true });
      pushed++;
    }
    await batch.commit();
  }

  return pushed;
}

async function applyRemoteTombstones(firestore: Firestore, userId: string) {
  const snapshot = await getDocs(collection(firestore, 'users', userId, 'tombstones'));
  let deleted = 0;

  for (const remoteDoc of snapshot.docs) {
    const tombstone = remoteDoc.data() as SyncTombstone;
    const config = COLLECTIONS.find(item => item.cloudName === tombstone.collectionName);
    if (!config || !tombstone.recordId) continue;

    const local = await config.getLocal(tombstone.recordId);
    if (local && Date.parse(tombstone.deletedAt) >= getRecordStamp(local)) {
      await config.deleteLocal(tombstone.recordId);
      deleted++;
    }
  }

  return deleted;
}

async function pushTombstones(firestore: Firestore, userId: string) {
  const tombstones = await db.syncTombstones.toArray();
  let deleted = 0;

  for (const chunk of chunkArray(tombstones, 350)) {
    const batch = writeBatch(firestore);
    for (const tombstone of chunk) {
      const config = COLLECTIONS.find(item => item.cloudName === tombstone.collectionName);
      if (!config) continue;

      const cloudId = String(tombstone.recordId);
      batch.set(
        doc(firestore, 'users', userId, 'tombstones', `${tombstone.collectionName}_${cloudId}`),
        sanitizeForFirestore({ ...tombstone, userId }) as DocumentData,
        { merge: true },
      );
      batch.delete(doc(firestore, 'users', userId, tombstone.collectionName, cloudId));
      deleted++;
    }
    await batch.commit();
  }

  return deleted;
}

export async function wipeCloudDataForUser(userId: string) {
  const firestore = getFirebaseDb();
  if (!firestore) throw new Error('Firebase is not configured');

  for (const config of COLLECTIONS) {
    await deleteCollectionDocs(firestore, userId, config.cloudName);
  }
  await deleteCollectionDocs(firestore, userId, 'tombstones');
}

async function deleteCollectionDocs(firestore: Firestore, userId: string, collectionName: string) {
  const snapshot = await getDocs(collection(firestore, 'users', userId, collectionName));
  await Promise.all(snapshot.docs.map(remoteDoc => deleteDoc(remoteDoc.ref)));
}

function toCloudRecord(record: SyncRecord, userId: string): DocumentData {
  const recordUpdatedAt = new Date(getRecordStamp(record)).toISOString();
  return sanitizeForFirestore({
    ...record,
    userId,
    localId: record.id,
    recordUpdatedAt,
    cloudUpdatedAt: new Date().toISOString(),
  }) as DocumentData;
}

function fromCloudRecord(data: DocumentData): SyncRecord {
  const { localId, recordUpdatedAt, cloudUpdatedAt, ...record } = data;
  return sanitizeForLocal({
    ...record,
    id: Number(record.id ?? localId),
    updatedAt: record.updatedAt ?? recordUpdatedAt ?? cloudUpdatedAt,
  }) as SyncRecord;
}

function getRecordStamp(record: Partial<SyncRecord>) {
  const candidates = [
    'updatedAt' in record ? record.updatedAt : undefined,
    'endTime' in record ? record.endTime : undefined,
    'createdAt' in record ? record.createdAt : undefined,
    'startTime' in record ? record.startTime : undefined,
  ].filter(Boolean) as string[];

  const stamp = candidates[0] ? Date.parse(candidates[0]) : 0;
  return Number.isFinite(stamp) ? stamp : 0;
}

function sanitizeForFirestore(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForFirestore);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitizeForFirestore(item)]),
    );
  }
  return value;
}

function sanitizeForLocal<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sanitizeForLocal) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !['cloudUpdatedAt', 'recordUpdatedAt', 'localId'].includes(key))
        .map(([key, item]) => [key, sanitizeForLocal(item)]),
    ) as T;
  }
  return value;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
