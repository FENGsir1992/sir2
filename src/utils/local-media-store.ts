// 简易 IndexedDB 本地媒体存储（仅浏览器端使用）
// 用于在管理员侧本地暂存预览视频，后续可再上传到服务器

const DB_NAME = 'wz-media';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

type VideoRecord = {
  key: string; // 例如 preview:<workflowId>
  blob: Blob;
  updatedAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putVideo(key: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: VideoRecord = { key, blob, updatedAt: Date.now() };
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error as any);
  });
}

async function getVideoBlob(key: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => {
      const rec = req.result as VideoRecord | undefined;
      resolve(rec ? rec.blob : null);
    };
    req.onerror = () => reject(req.error);
  });
}

async function deleteVideo(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error as any);
  });
}

export const localMediaStore = {
  async savePreview(workflowId: string, file: File | Blob) {
    await putVideo(`preview:${workflowId}`, file);
  },
  async getPreviewBlob(workflowId: string): Promise<Blob | null> {
    return getVideoBlob(`preview:${workflowId}`);
  },
  async deletePreview(workflowId: string) {
    await deleteVideo(`preview:${workflowId}`);
  }
};




