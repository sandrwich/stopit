import { useRef, useState, useEffect, useCallback } from 'react';
import MemeCanvas from './MemeCanvas.tsx';
import { useMeme } from '../../context/MemeContext.tsx';
import { useExport } from '../../hooks/useExport.tsx';

export default function PreviewPanel() {
  const { manifest } = useMeme();
  const { canvasRef } = useExport();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMeasureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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

  // Recalc when content changes (canvas height may change)
  useEffect(() => {
    // Small delay to let the canvas render its new content
    const id = requestAnimationFrame(recalcScale);
    return () => cancelAnimationFrame(id);
  }, [manifest.content, manifest.images, recalcScale]);

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
        }}
      >
        <div ref={canvasMeasureRef}>
          <MemeCanvas ref={canvasRef} manifest={manifest} />
        </div>
      </div>
    </div>
  );
}
