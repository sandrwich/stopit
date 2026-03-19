import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useMeme } from './MemeContext.tsx';
import type { SnapshotListItem } from '../types/manifest.ts';
import type { ImageListItem } from '../lib/idb.ts';
import * as idb from '../lib/idb.ts';

interface HistoryContextValue {
  snapshots: SnapshotListItem[];
  images: ImageListItem[];
  loading: boolean;
  saveSnapshot: (label?: string) => Promise<string>;
  restoreSnapshot: (id: string) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  loadImageDataUrl: (hash: string) => Promise<string | null>;
  refreshSnapshots: () => Promise<void>;
  refreshImages: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const { manifest, dispatch } = useMeme();
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [images, setImages] = useState<ImageListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSnapshots = useCallback(async () => {
    const list = await idb.listSnapshots();
    setSnapshots(list);
  }, []);

  const refreshImages = useCallback(async () => {
    const list = await idb.listImages();
    setImages(list);
  }, []);

  useEffect(() => {
    Promise.all([refreshSnapshots(), refreshImages()])
      .then(async () => {
        // Load most recent snapshot on startup
        const list = await idb.listSnapshots();
        if (list.length > 0) {
          const latest = await idb.loadSnapshot(list[0].id);
          if (latest) dispatch({ type: 'SET_MANIFEST', payload: latest });
        }
      })
      .finally(() => setLoading(false));
  }, [refreshSnapshots, refreshImages, dispatch]);

  const saveSnapshot = useCallback(async (label?: string) => {
    const autoLabel = label || extractLabel(manifest.content);
    const id = await idb.saveSnapshot(manifest, autoLabel);
    await Promise.all([refreshSnapshots(), refreshImages()]);
    return id;
  }, [manifest, refreshSnapshots, refreshImages]);

  const restoreSnapshot = useCallback(async (id: string) => {
    const loaded = await idb.loadSnapshot(id);
    if (loaded) {
      dispatch({ type: 'SET_MANIFEST', payload: loaded });
    }
  }, [dispatch]);

  const deleteSnapshot = useCallback(async (id: string) => {
    await idb.deleteSnapshot(id);
    await idb.pruneOrphanImages();
    await Promise.all([refreshSnapshots(), refreshImages()]);
  }, [refreshSnapshots, refreshImages]);

  const toggleFavorite = useCallback(async (id: string) => {
    await idb.toggleFavorite(id);
    await refreshSnapshots();
  }, [refreshSnapshots]);

  const loadImageDataUrl = useCallback(async (hash: string) => {
    return idb.loadImageDataUrl(hash);
  }, []);

  return (
    <HistoryContext.Provider value={{
      snapshots, images, loading,
      saveSnapshot, restoreSnapshot, deleteSnapshot, toggleFavorite,
      loadImageDataUrl, refreshSnapshots, refreshImages,
    }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}

/** Extract a label from the first heading in markdown, or fallback to timestamp. */
function extractLabel(content: string): string {
  const match = content.match(/^#{1,3}\s+(.+)/m);
  if (match) {
    const heading = match[1].replace(/\*\*/g, '').trim();
    return heading.length > 50 ? heading.slice(0, 47) + '...' : heading;
  }
  return new Date().toLocaleString();
}
