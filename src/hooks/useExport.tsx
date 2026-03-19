import { createContext, useContext, useState, useRef, type ReactNode, type RefObject } from 'react';
import { toPng, toJpeg } from 'html-to-image';
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

      const dataUrl = useJpeg
        ? await toJpeg(el, {
            pixelRatio: 2,
            cacheBust: true,
            quality: jpegQuality / 100,
          })
        : await toPng(el, {
            pixelRatio: 2,
            cacheBust: true,
          });

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
