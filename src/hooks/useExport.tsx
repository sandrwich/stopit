import { createContext, useContext, useState, useRef, type ReactNode, type RefObject } from 'react';
import { toPng } from 'html-to-image';
import { useMeme } from '../context/MemeContext.tsx';

interface ExportContextValue {
  canvasRef: RefObject<HTMLDivElement | null>;
  exportToPng: () => Promise<void>;
  exporting: boolean;
}

const ExportContext = createContext<ExportContextValue | null>(null);

export function ExportProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const { manifest } = useMeme();

  async function exportToPng() {
    const el = canvasRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const jpegQuality = manifest.filters?.jpegQuality ?? 100;
      const useJpeg = jpegQuality < 100;

      const opts = { pixelRatio: 2, cacheBust: true };
      let dataUrl: string;

      if (useJpeg) {
        // Render to PNG first, then crush through canvas for real JPEG artifacts
        const pngUrl = await toPng(el, opts);
        const img = new Image();
        img.src = pngUrl;
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        const q = jpegQuality / 100;
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
            dataUrl = jpegUrl;
          }
        }
        dataUrl ??= c.toDataURL('image/jpeg', q);
      } else {
        dataUrl = await toPng(el, opts);
      }

      const ext = useJpeg ? 'jpg' : 'png';
      const link = document.createElement('a');
      link.download = `stopit-meme-${Date.now()}.${ext}`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <ExportContext.Provider value={{ canvasRef, exportToPng, exporting }}>
      {children}
    </ExportContext.Provider>
  );
}

export function useExport() {
  const ctx = useContext(ExportContext);
  if (!ctx) throw new Error('useExport must be used within ExportProvider');
  return ctx;
}
