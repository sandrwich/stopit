import { forwardRef } from 'react';
import type { MemeManifest } from '../../types/manifest.ts';
import { renderMemeMarkdown } from '../../lib/markdown.ts';

interface MemeCanvasProps {
  manifest: MemeManifest;
}

/**
 * The meme render target. Inline styles only — no Tailwind.
 * This div is captured by html-to-image for PNG export.
 */
const MemeCanvas = forwardRef<HTMLDivElement, MemeCanvasProps>(({ manifest }, ref) => {
  const { canvasWidth, background, content, images, filters } = manifest;
  const bgGradient = `linear-gradient(${background.direction}, ${background.from}, ${background.to})`;
  const html = renderMemeMarkdown(content, images, canvasWidth, filters);

  // Crustiness: blur + contrast + saturation boost
  const crustiness = filters?.crustiness ?? 0;
  const cssFilter = crustiness > 0
    ? `blur(${crustiness * 0.008}px) contrast(${1 + crustiness * 0.005}) saturate(${1 + crustiness * 0.008})`
    : undefined;

  return (
    <div
      ref={ref}
      style={{
        width: canvasWidth,
        background: bgGradient,
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        color: '#000',
        padding: '40px 50px',
        boxSizing: 'border-box',
        lineHeight: 1.4,
        filter: cssFilter,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

MemeCanvas.displayName = 'MemeCanvas';
export default MemeCanvas;
