import { useState, useEffect } from 'react';
import { useHistory } from '../../context/HistoryContext.tsx';
import { useMeme } from '../../context/MemeContext.tsx';
import { X, Download } from 'lucide-react';

export default function ImageGallery() {
  const { images, loadImageDataUrl } = useHistory();
  const { manifest, dispatch } = useMeme();

  const [loadedUrls, setLoadedUrls] = useState<Map<string, string>>(new Map());
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [slotPicker, setSlotPicker] = useState<string | null>(null);

  // Lazy-load visible image data URLs
  useEffect(() => {
    const toLoad = images.filter(img => !loadedUrls.has(img.hash)).slice(0, 20);
    if (toLoad.length === 0) return;
    let cancelled = false;
    Promise.all(
      toLoad.map(async img => {
        const url = await loadImageDataUrl(img.hash);
        return { hash: img.hash, url };
      }),
    ).then(results => {
      if (cancelled) return;
      setLoadedUrls(prev => {
        const next = new Map(prev);
        for (const r of results) {
          if (r.url) next.set(r.hash, r.url);
        }
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [images, loadedUrls, loadImageDataUrl]);

  function handleUseInSlot(hash: string, slotIndex: number) {
    const url = loadedUrls.get(hash);
    if (!url) return;
    const img = manifest.images[slotIndex];
    dispatch({
      type: 'UPDATE_IMAGE',
      index: slotIndex,
      payload: { ...img, src: url },
    });
    setSlotPicker(null);
  }

  function handleDownload(hash: string) {
    const url = loadedUrls.get(hash);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `stopit-${hash.slice(0, 8)}.png`;
    a.click();
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-neutral-400">
        No images stored yet
        <p className="text-xs mt-1">Images are saved when you generate or upload them</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <p className="text-xs text-neutral-400 mb-3">
        {images.length} image{images.length !== 1 ? 's' : ''} stored
        {' · '}
        {formatBytes(images.reduce((sum, img) => sum + img.byteSize, 0))}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {images.map(img => {
          const url = loadedUrls.get(img.hash);
          return (
            <div key={img.hash} className="relative group">
              <div
                onClick={() => url && setLightbox(img.hash)}
                className="aspect-square rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-shadow bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center"
              >
                {url ? (
                  <img src={url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-transparent animate-spin" />
                )}
              </div>

              {/* Hover actions */}
              {url && (
                <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(img.hash)}
                    className="p-1 rounded bg-black/60 text-white hover:bg-black/80"
                    title="Download"
                  >
                    <Download size={12} />
                  </button>
                  <button
                    onClick={() => setSlotPicker(slotPicker === img.hash ? null : img.hash)}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-black/60 text-white hover:bg-black/80"
                  >
                    Use
                  </button>
                </div>
              )}

              {/* Slot picker */}
              {slotPicker === img.hash && (
                <div className="absolute bottom-8 right-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1.5 z-10">
                  <p className="text-[10px] text-neutral-400 px-1.5 pb-1">Place in slot:</p>
                  <div className="flex gap-1">
                    {manifest.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handleUseInSlot(img.hash, i)}
                        className="px-2 py-1 text-xs rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 text-neutral-700 dark:text-neutral-300 hover:text-blue-600"
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && loadedUrls.get(lightbox) && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-[80vw] max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <img
              src={loadedUrls.get(lightbox)!}
              alt=""
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="absolute -top-3 -right-3 flex gap-1.5">
              <button
                onClick={() => handleDownload(lightbox)}
                className="p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-lg text-neutral-500 hover:text-blue-600"
                title="Download"
              >
                <Download size={16} />
              </button>
              <button
                onClick={() => setLightbox(null)}
                className="p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-lg text-neutral-500 hover:text-neutral-900"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
