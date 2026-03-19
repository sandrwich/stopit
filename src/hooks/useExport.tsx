import { createContext, useContext, useState, useRef, type ReactNode, type RefObject } from 'react';
import { toPng } from 'html-to-image';

interface ExportContextValue {
  canvasRef: RefObject<HTMLDivElement | null>;
  exportToPng: () => Promise<void>;
  exporting: boolean;
}

const ExportContext = createContext<ExportContextValue | null>(null);

export function ExportProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function exportToPng() {
    const el = canvasRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `stopit-meme-${Date.now()}.png`;
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
