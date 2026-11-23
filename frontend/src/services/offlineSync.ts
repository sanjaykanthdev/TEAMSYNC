// IndexedDB offline mutation store and synchronizer
const DB_NAME = 'teamsync_offline_db';
const DB_VERSION = 1;
const QUEUE_STORE = 'mutation_queue';
const DOC_STORE = 'documents_cache';

interface Mutation {
  id?: number;
  type: 'TASK_CREATE' | 'TASK_UPDATE' | 'DOC_UPDATE';
  payload: any;
  timestamp: number;
}

class OfflineSyncService {
  private dbPromise: Promise<IDBDatabase>;
  private isSyncing = false;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(DOC_STORE)) {
          db.createObjectStore(DOC_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Listen to online events to automatically replay pending changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OfflineSync] Network restored, replaying queued mutations...');
        this.flushQueue();
      });
    }
  }

  async queueMutation(type: Mutation['type'], payload: any): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    store.add({
      type,
      payload,
      timestamp: Date.now(),
    });
  }

  async getPendingMutations(): Promise<Mutation[]> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async cacheDoc(docId: number, title: string, content: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(DOC_STORE, 'readwrite');
    const store = tx.objectStore(DOC_STORE);
    store.put({ id: docId, title, content, updated_at: Date.now() });
  }

  async getCachedDoc(docId: number): Promise<{ id: number; title: string; content: string } | null> {
    const db = await this.dbPromise;
    return new Promise((resolve) => {
      const tx = db.transaction(DOC_STORE, 'readonly');
      const store = tx.objectStore(DOC_STORE);
      const req = store.get(docId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async flushQueue(): Promise<number> {
    if (this.isSyncing || !navigator.onLine) return 0;
    this.isSyncing = true;

    try {
      const mutations = await this.getPendingMutations();
      if (mutations.length === 0) {
        this.isSyncing = false;
        return 0;
      }

      const db = await this.dbPromise;
      let syncedCount = 0;

      for (const m of mutations) {
        try {
          // Replay API call based on mutation type
          const { api } = await import('./api');
          if (m.type === 'TASK_CREATE') {
            await api.createTask(m.payload);
          } else if (m.type === 'TASK_UPDATE') {
            await api.updateTask(m.payload.id, m.payload.data);
          } else if (m.type === 'DOC_UPDATE') {
            await api.updateDocument(m.payload.id, m.payload.data);
          }

          // Remove completed mutation from queue
          const tx = db.transaction(QUEUE_STORE, 'readwrite');
          tx.objectStore(QUEUE_STORE).delete(m.id!);
          syncedCount++;
        } catch (e) {
          console.warn('[OfflineSync] Mutation replay error, will retry later:', e);
          break;
        }
      }

      this.isSyncing = false;
      return syncedCount;
    } catch (e) {
      this.isSyncing = false;
      return 0;
    }
  }
}

export const offlineSync = new OfflineSyncService();
