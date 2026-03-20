import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import MemeCanvas from './MemeCanvas.tsx';
import { useMeme } from '../../context/MemeContext.tsx';
import { useExport } from '../../hooks/useExport.tsx';
import type { MemeManifest } from '../../types/manifest.ts';

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function PreviewPanel() {
  const { manifest } = useMeme();
  const { canvasRef } = useExport();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMeasureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [jpegOverlay, setJpegOverlay] = useState<string | null>(null);

  // Debounce filters so sliders don't cause per-tick re-renders of the canvas
  const debouncedFilters = useDebouncedValue(manifest.filters, 200);
  const renderManifest = useMemo<MemeManifest>(
    () => ({ ...manifest, filters: debouncedFilters }),
    [manifest, debouncedFilters],
  );

  const jpegQuality = debouncedFilters?.jpegQuality ?? 100;
  const showJpeg = jpegQuality < 100;

  const recalcScale = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasMeasureRef.current;
    if (!container || !canvas) return;

    const availableWidth = container.clientWidth - 32;
    const availableHeight = container.clientHeight - 32;
    const canvasHeight = canvas.scrollHeight;
    const canvasWidth = manifest.canvasWidth;

    const scaleX = availableWidth / canvasWidth;
    const scaleY = canvasHeight > 0 ? availableHeight / canvasHeight : 1;
    setScale(Math.min(1, scaleX, scaleY));
  }, [manifest.canvasWidth]);

  useEffect(() => {
    recalcScale();
    const obs = new ResizeObserver(recalcScale);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [recalcScale]);

  useEffect(() => {
    const id = requestAnimationFrame(recalcScale);
    return () => cancelAnimationFrame(id);
  }, [manifest.content, manifest.images, recalcScale]);

  // Generate JPEG preview overlay — crush through canvas element for real artifacts
  useEffect(() => {
    if (!showJpeg) {
      setJpegOverlay(null);
      return;
    }
    const el = canvasRef.current;
    if (!el) return;

    const timeout = setTimeout(async () => {
      try {
        const { toPng } = await import('html-to-image');
        const q = jpegQuality / 100;

        // Render to PNG first, then crush through canvas JPEG
        const pngUrl = await toPng(el, {
          pixelRatio: 1,
          cacheBust: true,
        });

        const img = new Image();
        img.src = pngUrl;
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });

        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;

        // Multiple compression passes for more visible artifacts
        const passes = jpegQuality < 30 ? 3 : jpegQuality < 50 ? 2 : 1;
        let current: HTMLImageElement | HTMLCanvasElement = img;
        for (let i = 0; i < passes; i++) {
          ctx.drawImage(current, 0, 0);
          const jpegUrl = c.toDataURL('image/jpeg', q);
          if (i < passes - 1) {
            const next = new Image();
            next.src = jpegUrl;
            await new Promise<void>((res, rej) => { next.onload = () => res(); next.onerror = rej; });
            current = next;
          } else {
            setJpegOverlay(jpegUrl);
          }
        }
      } catch {
        setJpegOverlay(null);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [showJpeg, jpegQuality, manifest.content, manifest.images, debouncedFilters, canvasRef]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-start justify-center p-4"
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          width: manifest.canvasWidth,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div ref={canvasMeasureRef}>
          <MemeCanvas ref={canvasRef} manifest={renderManifest} />
        </div>
        {jpegOverlay && (
          <img
            src={jpegOverlay}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
}
