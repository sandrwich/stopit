import type {
  MemeManifest,
  ManifestImage,
  SnapshotImage,
  SnapshotManifest,
  SnapshotRecord,
  SnapshotListItem,
  ImageRecord,
} from '../types/manifest.ts';

const DB_NAME = 'stopit-db';
const DB_VERSION = 1;

// ── Database lifecycle ──

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'hash' });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        const store = db.createObjectStore('snapshots', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('favorite', 'favorite');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(
  stores: string | string[],
  mode: IDBTransactionMode,
): Promise<{ tx: IDBTransaction; store: (name: string) => IDBObjectStore }> {
  return openDb().then(db => {
    const t = db.transaction(stores, mode);
    return { tx: t, store: (name: string) => t.objectStore(name) };
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txComplete(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ── Image hashing & storage ──

export async function hashImage(dataUrl: string): Promise<string> {
  const encoded = new TextEncoder().encode(dataUrl);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Store image by hash. Returns hash. No-op if already exists. */
export async function storeImage(dataUrl: string): Promise<string> {
  const hash = await hashImage(dataUrl);
  const { tx: t, store } = await tx('images', 'readwrite');
  const existing = await reqToPromise(store('images').get(hash));
  if (!existing) {
    store('images').put({
      hash,
      dataUrl,
      byteSize: dataUrl.length,
      createdAt: Date.now(),
    } satisfies ImageRecord);
  }
  await txComplete(t);
  return hash;
}

/** Load image data URL by hash. Returns null if not found. */
export async function loadImage(hash: string): Promise<string | null> {
  const { store } = await tx('images', 'readonly');
  const record = await reqToPromise<ImageRecord | undefined>(store('images').get(hash));
  return record?.dataUrl ?? null;
}

// ── Snapshot operations ──

/** Save a manifest snapshot. Returns the snapshot id. */
export async function saveSnapshot(
  manifest: MemeManifest,
  label: string,
): Promise<string> {
  // Hash and store all non-empty images
  const snapshotImages: SnapshotImage[] = await Promise.all(
    manifest.images.map(async (img: ManifestImage) => {
      const hash = img.src ? await storeImage(img.src) : '';
      return { hash, alt: img.alt, generationPrompt: img.generationPrompt };
    }),
  );

  const snapshotManifest: SnapshotManifest = {
    version: manifest.version,
    canvasWidth: manifest.canvasWidth,
    background: { ...manifest.background },
    content: manifest.content,
    images: snapshotImages,
  };

  const id = crypto.randomUUID();
  const record: SnapshotRecord = {
    id,
    manifest: snapshotManifest,
    label,
    createdAt: Date.now(),
    favorite: 0,
  };

  const { tx: t, store } = await tx('snapshots', 'readwrite');
  store('snapshots').put(record);
  await txComplete(t);
  return id;
}

/** Load a snapshot and resolve image hashes back to data URLs. */
export async function loadSnapshot(id: string): Promise<MemeManifest | null> {
  const { store } = await tx('snapshots', 'readonly');
  const record = await reqToPromise<SnapshotRecord | undefined>(store('snapshots').get(id));
  if (!record) return null;

  const images: ManifestImage[] = await Promise.all(
    record.manifest.images.map(async (img: SnapshotImage) => {
      const src = img.hash ? (await loadImage(img.hash)) ?? '' : '';
      return { src, alt: img.alt, generationPrompt: img.generationPrompt };
    }),
  );

  return {
    version: record.manifest.version,
    canvasWidth: record.manifest.canvasWidth,
    background: { ...record.manifest.background },
    content: record.manifest.content,
    images,
  };
}

/** List all snapshots, newest first. Lightweight — no image data. */
export async function listSnapshots(): Promise<SnapshotListItem[]> {
  const { store } = await tx('snapshots', 'readonly');
  const all = await reqToPromise<SnapshotRecord[]>(store('snapshots').index('createdAt').getAll());
  return all
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(r => ({
      id: r.id,
      label: r.label,
      heading: extractHeading(r.manifest.content),
      content: r.manifest.content,
      createdAt: r.createdAt,
      favorite: r.favorite === 1,
      imageCount: r.manifest.images.filter(i => i.hash).length,
      background: r.manifest.background,
      canvasWidth: r.manifest.canvasWidth,
    }));
}

/** Update an existing snapshot's manifest (e.g. after generating images). */
export async function updateSnapshot(id: string, manifest: MemeManifest): Promise<void> {
  const snapshotImages: SnapshotImage[] = await Promise.all(
    manifest.images.map(async (img: ManifestImage) => {
      const hash = img.src ? await storeImage(img.src) : '';
      return { hash, alt: img.alt, generationPrompt: img.generationPrompt };
    }),
  );

  const { tx: t, store } = await tx('snapshots', 'readwrite');
  const s = store('snapshots');
  const record = await reqToPromise<SnapshotRecord | undefined>(s.get(id));
  if (!record) return;
  record.manifest = {
    version: manifest.version,
    canvasWidth: manifest.canvasWidth,
    background: { ...manifest.background },
    content: manifest.content,
    images: snapshotImages,
  };
  s.put(record);
  await txComplete(t);
}

/** Delete a snapshot by id. */
export async function deleteSnapshot(id: string): Promise<void> {
  const { tx: t, store } = await tx('snapshots', 'readwrite');
  store('snapshots').delete(id);
  await txComplete(t);
}

/** Toggle favorite. Returns the new favorite state. */
export async function toggleFavorite(id: string): Promise<boolean> {
  const { tx: t, store } = await tx('snapshots', 'readwrite');
  const s = store('snapshots');
  const record = await reqToPromise<SnapshotRecord | undefined>(s.get(id));
  if (!record) return false;
  record.favorite = record.favorite === 1 ? 0 : 1;
  s.put(record);
  await txComplete(t);
  return record.favorite === 1;
}

// ── Image gallery ──

export interface ImageListItem {
  hash: string;
  byteSize: number;
  createdAt: number;
}

/** List all stored images (without the actual data URLs). */
export async function listImages(): Promise<ImageListItem[]> {
  const { store } = await tx('images', 'readonly');
  const all = await reqToPromise<ImageRecord[]>(store('images').getAll());
  return all
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(r => ({ hash: r.hash, byteSize: r.byteSize, createdAt: r.createdAt }));
}

/** Load a single image's data URL by hash. */
export async function loadImageDataUrl(hash: string): Promise<string | null> {
  return loadImage(hash);
}

// ── Cleanup ──

/** Delete images not referenced by any snapshot. Returns count removed. */
export async function pruneOrphanImages(): Promise<number> {
  const { store: snapStore } = await tx('snapshots', 'readonly');
  const snapshots = await reqToPromise<SnapshotRecord[]>(snapStore('snapshots').getAll());

  const usedHashes = new Set<string>();
  for (const snap of snapshots) {
    for (const img of snap.manifest.images) {
      if (img.hash) usedHashes.add(img.hash);
    }
  }

  const { tx: t, store: imgStore } = await tx('images', 'readwrite');
  const allImages = await reqToPromise<ImageRecord[]>(imgStore('images').getAll());
  let removed = 0;
  for (const img of allImages) {
    if (!usedHashes.has(img.hash)) {
      imgStore('images').delete(img.hash);
      removed++;
    }
  }
  await txComplete(t);
  return removed;
}

// ── Helpers ──

/** Extract the first heading from markdown content for grouping. */
function extractHeading(content: string): string {
  const match = content.match(/^#{1,3}\s+(.+)/m);
  if (!match) return '';
  return match[1].replace(/\*\*/g, '').trim();
}

