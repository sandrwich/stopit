import { Marked, type Tokens, type Token } from 'marked';
import type { ManifestImage, MemeFilters } from '../types/manifest.ts';

/**
 * Renders meme markdown to inline-styled HTML for the MemeCanvas.
 * Uses ONLY inline styles — no CSS classes — for html-to-image export fidelity.
 *
 * Custom features beyond standard markdown:
 * - ![label](image:N)  → image slot with red label underneath
 * - Adjacent image refs → rendered as a flex row
 * - Last paragraph      → auto-styled red+bold (closing line)
 * - `inline code`       → monospace with background
 * - ```code blocks```   → dark bg monospace block
 */


// --- Seeded PRNG for deterministic messiness ---

function createRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
}

// --- Main render function ---

export function renderMemeMarkdown(markdown: string, images: ManifestImage[], canvasWidth: number, filters?: MemeFilters, background?: { from: string; to: string }): string {
  const marked = new Marked();
  const tokens = marked.lexer(markdown);

  // Find last non-empty paragraph for auto-red closing line
  let lastParagraphIdx = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.type === 'paragraph' && t.raw.trim() && !hasImageRefs(t as Tokens.Paragraph)) {
      lastParagraphIdx = i;
      break;
    }
  }

  const baseFontSize = Math.min(18, canvasWidth * 0.0225);
  const parts: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isClosingLine = i === lastParagraphIdx;

    switch (token.type) {
      case 'heading':
        parts.push(renderHeading(token as Tokens.Heading, canvasWidth, images));
        break;
      case 'list':
        parts.push(renderList(token as Tokens.List, images, baseFontSize));
        break;
      case 'paragraph':
        if (hasImageRefs(token as Tokens.Paragraph)) {
          parts.push(renderImageRow(token as Tokens.Paragraph, images, canvasWidth));
        } else {
          parts.push(renderParagraph(token as Tokens.Paragraph, images, baseFontSize, isClosingLine));
        }
        break;
      case 'code':
        parts.push(renderCodeBlock(token as Tokens.Code));
        break;
      case 'blockquote':
        parts.push(renderBlockquote(token as Tokens.Blockquote, images, baseFontSize));
        break;
      case 'hr':
        parts.push('<hr style="border:none;border-top:2px solid rgba(0,0,0,0.15);margin:16px 0"/>');
        break;
      case 'space':
        break;
      default:
        break;
    }
  }

  let html = parts.join('');

  const messiness = filters?.textMessiness ?? 0;
  if (messiness > 0) {
    const jpegQ = filters?.jpegQuality ?? 100;
    const bgMid = jpegQ <= 50 && background ? averageHexColors(background.from, background.to) : undefined;
    html = applyMessiness(html, messiness / 100, jpegQ, bgMid);
  }

  return html;
}

const PASTE_FONTS = [
  'Arial, sans-serif',
  '"Times New Roman", serif',
  'Georgia, serif',
  'Verdana, sans-serif',
  'Impact, sans-serif',
  '"Trebuchet MS", sans-serif',
  '"Courier New", monospace',
  '"Comic Sans MS", cursive',
];

/** Use DOMParser to walk the rendered HTML and apply messiness transforms. */
function applyMessiness(html: string, strength: number, jpegQuality = 100, bgPatchColor?: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;
  const showPatches = jpegQuality <= 50 && bgPatchColor;

  // Pick one "pasted-in" font for all bold text in this meme
  const globalRng = createRng(html.slice(0, 100));
  const pasteFont = PASTE_FONTS[Math.floor(globalRng() * PASTE_FONTS.length)];

  const walk = (node: Node, isFormatted: boolean) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // List items: random spacing and indent
        if (tag === 'li') {
          const text = el.textContent ?? '';
          const rng = createRng(text);
          const marginVar = 10 + (rng() - 0.5) * 20 * strength;
          const indentVar = (rng() - 0.5) * 50 * strength;
          el.style.marginBottom = `${Math.max(0, marginVar)}px`;
          el.style.paddingLeft = `${Math.max(0, indentVar)}px`;
          walk(el, isFormatted);
        }
        // Bold/em: heavy wobble + random font + optional bg patch
        else if (tag === 'strong' || tag === 'em') {
          const text = el.textContent ?? '';
          const rng = createRng(text);
          const raw = (rng() - 0.5) * 2; // -1 to 1
          const sizeVar = 1 + (raw > 0 ? raw * 0.6 : raw * 0.3) * strength;
          const yShift = (rng() - 0.5) * 4 * strength;
          el.style.fontSize = `${sizeVar}em`;
          el.style.verticalAlign = `${yShift}px`;
          // Use the "pasted-in" font (same for all bold text in this meme)
          if (rng() < strength * 0.7) {
            el.style.fontFamily = pasteFont;
          }
          // Solid background patch at low JPEG quality — mismatched padding
          // Smaller text = proportionally bigger padding (box stays big)
          if (showPatches && rng() < 0.6) {
            el.style.backgroundColor = bgPatchColor!;
            const vPadScale = sizeVar < 1 ? 1 + (1 - sizeVar) * 3 : 1;
            const pt = Math.round(rng() * 4 * vPadScale);
            const pr = Math.round(1 + rng() * 8);
            const pb = Math.round(rng() * 6 * vPadScale);
            const pl = Math.round(1 + rng() * 8);
            el.style.padding = `${pt}px ${pr}px ${pb}px ${pl}px`;
          }
          walk(el, true);
        }
        // Images: heavy offset like bold text
        else if (tag === 'img') {
          const rng = createRng(el.getAttribute('alt') || el.getAttribute('src')?.slice(-20) || 'img');
          const shiftX = (rng() - 0.5) * 30 * strength;
          const shiftY = (rng() - 0.5) * 20 * strength;
          const sizeVar = 1 + (rng() - 0.5) * 0.4 * strength;
          el.style.transform = `translate(${shiftX}px,${shiftY}px) scale(${sizeVar})`;
        }
        // Image cell containers (flex:1 1 0 children of the image row): offset the whole cell
        else if (tag === 'div' && el.style.flex?.includes('1 1 0')) {
          const rng = createRng(el.textContent ?? 'cell');
          const shiftX = (rng() - 0.5) * 30 * strength;
          const shiftY = (rng() - 0.5) * 20 * strength;
          const sizeVar = 1 + (rng() - 0.5) * 0.3 * strength;
          el.style.transform = `translate(${shiftX}px,${shiftY}px) scale(${sizeVar})`;
          walk(el, true);
        }
        // Red labels (color:#cc0000 → normalized to rgb(204, 0, 0)): heavy like bold
        else if (el.style.color.includes('204')) {
          const text = el.textContent ?? '';
          const rng = createRng(text);
          const sizeVar = 1 + (rng() - 0.5) * 1.2 * strength;
          const yShift = (rng() - 0.5) * 14 * strength;
          const origSize = parseFloat(el.style.fontSize) || 15;
          el.style.fontSize = `${origSize * sizeVar}px`;
          el.style.position = 'relative';
          el.style.top = `${yShift}px`;
          walk(el, true);
        }
        // Image placeholder divs (the gray boxes): heavy offset
        else if (tag === 'div' && el.style.background.includes('0, 0, 0')) {
          const rng = createRng(el.textContent ?? 'placeholder');
          const shiftX = (rng() - 0.5) * 30 * strength;
          const shiftY = (rng() - 0.5) * 20 * strength;
          const sizeVar = 1 + (rng() - 0.5) * 0.4 * strength;
          el.style.transform = `translate(${shiftX}px,${shiftY}px) scale(${sizeVar})`;
        }
        else {
          walk(el, isFormatted);
        }
      }
      // Text nodes not inside bold/em: subtle variation
      else if (child.nodeType === Node.TEXT_NODE && !isFormatted) {
        const text = child.textContent?.trim();
        if (!text) continue;
        const rng = createRng(text);
        const sizeVar = 1 + (rng() - 0.5) * 0.15 * strength;
        const yShift = (rng() - 0.5) * 2 * strength;
        const span = doc.createElement('span');
        span.style.fontSize = `${sizeVar}em`;
        span.style.verticalAlign = `${yShift}px`;
        span.textContent = child.textContent;
        child.parentNode?.replaceChild(span, child);
      }
    }
  };

  walk(root, false);
  return root.innerHTML;
}

// --- Block renderers ---

function renderHeading(token: Tokens.Heading, canvasWidth: number, images: ManifestImage[]): string {
  const sizes: Record<number, number> = {
    1: Math.min(48, canvasWidth * 0.06),
    2: Math.min(36, canvasWidth * 0.045),
    3: Math.min(28, canvasWidth * 0.035),
  };
  const fontSize = sizes[token.depth] ?? 20;

  return `<h${token.depth} style="font-size:${fontSize}px;font-weight:900;text-transform:uppercase;text-align:center;margin:0 0 16px 0;line-height:1.1;letter-spacing:-0.5px">${renderInline(token.tokens ?? [], images)}</h${token.depth}>`;
}

function renderList(token: Tokens.List, images: ManifestImage[], fontSize: number): string {
  const items = token.items.map((item: Tokens.ListItem) => {
    const inlineTokens = item.tokens?.[0]?.type === 'paragraph'
      ? (item.tokens[0] as Tokens.Paragraph).tokens ?? []
      : item.tokens ?? [];
    return `<li style="margin-bottom:10px;line-height:1.45">${renderInline(inlineTokens, images)}</li>`;
  }).join('');

  const tag = token.ordered ? 'ol' : 'ul';
  const listStyle = token.ordered ? 'decimal' : 'disc';
  return `<${tag} style="list-style-type:${listStyle};padding-left:28px;margin:0 0 20px 0;font-size:${fontSize}px">${items}</${tag}>`;
}

function hasImageRefs(token: Tokens.Paragraph): boolean {
  return token.tokens?.some(t => t.type === 'image' && (t as Tokens.Image).href.startsWith('image:')) ?? false;
}

function renderImageRow(token: Tokens.Paragraph, images: ManifestImage[], canvasWidth: number): string {
  const imageTokens = (token.tokens ?? []).filter(
    (t): t is Tokens.Image => t.type === 'image' && t.href.startsWith('image:')
  );
  if (imageTokens.length === 0) return '';

  const labelFontSize = Math.min(15, canvasWidth * 0.019);

  const cells = imageTokens.map(imgToken => {
    const idx = parseInt(imgToken.href.replace('image:', ''), 10);
    const img = images[idx];
    const label = imgToken.text || '';

    const imgHtml = img?.src
      ? `<img src="${esc(img.src)}" alt="${esc(label)}" style="width:100%;height:auto;max-height:200px;object-fit:contain;border-radius:2px"/>`
      : `<div style="width:100%;height:120px;background:rgba(0,0,0,0.08);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#888">${img?.generationPrompt ? '🖼️' : 'No image'}</div>`;

    const labelHtml = label
      ? `<div style="color:#cc0000;font-weight:700;font-size:${labelFontSize}px;margin-top:6px;text-align:center">${escapeHtml(label)}</div>`
      : '';

    return `<div style="flex:1 1 0;min-width:0;text-align:center">${imgHtml}${labelHtml}</div>`;
  }).join('');

  return `<div style="display:flex;gap:12px;justify-content:center;margin:16px 0">${cells}</div>`;
}

function renderParagraph(token: Tokens.Paragraph, images: ManifestImage[], fontSize: number, isClosingLine = false): string {
  const content = renderInline(token.tokens ?? [], images);
  const style = isClosingLine
    ? `text-align:center;font-size:${fontSize}px;margin:0 0 12px 0;line-height:1.4;font-weight:900`
    : `text-align:center;font-size:${fontSize}px;margin:0 0 12px 0;line-height:1.4`;
  return `<p style="${style}">${content}</p>`;
}

function renderCodeBlock(token: Tokens.Code): string {
  return `<pre style="background:#1e1e2e;color:#cdd6f4;padding:14px 18px;border-radius:6px;font-family:'Consolas','Fira Code',monospace;font-size:13px;overflow-x:auto;margin:12px 0;line-height:1.5;white-space:pre-wrap"><code>${escapeHtml(token.text)}</code></pre>`;
}

function renderBlockquote(token: Tokens.Blockquote, images: ManifestImage[], fontSize: number): string {
  const inner = token.tokens.map(t => {
    if (t.type === 'paragraph') {
      return `<p style="margin:0 0 8px 0">${renderInline((t as Tokens.Paragraph).tokens ?? [], images)}</p>`;
    }
    return '';
  }).join('');
  return `<blockquote style="border-left:4px solid rgba(0,0,0,0.2);padding-left:16px;margin:12px 0;font-size:${fontSize}px;font-style:italic;color:#444">${inner}</blockquote>`;
}

// --- Inline rendering ---

function renderInline(tokens: Token[], images: ManifestImage[]): string {
  return tokens.map(token => {
    switch (token.type) {
      case 'text': {
        const t = token as Tokens.Text;
        if (t.tokens) return renderInline(t.tokens, images);
        return escapeHtml(t.raw).replace(/\n/g, '<br/>');
      }
      case 'strong':
        return `<strong style="font-weight:900">${renderInline((token as Tokens.Strong).tokens, images)}</strong>`;
      case 'em':
        return `<em>${renderInline((token as Tokens.Em).tokens, images)}</em>`;
      case 'del':
        return `<del style="text-decoration:line-through">${renderInline((token as Tokens.Del).tokens, images)}</del>`;
      case 'codespan':
        return `<code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:3px;font-family:'Consolas','Fira Code',monospace;font-size:0.9em">${escapeHtml((token as Tokens.Codespan).text)}</code>`;
      case 'image': {
        const img = token as Tokens.Image;
        if (img.href.startsWith('image:')) {
          const idx = parseInt(img.href.replace('image:', ''), 10);
          const manifestImg = images[idx];
          if (manifestImg?.src) {
            return `<img src="${esc(manifestImg.src)}" alt="${esc(img.text)}" style="height:1.3em;vertical-align:middle;margin:0 4px;border-radius:3px"/>`;
          }
          return `<span style="background:rgba(0,0,0,0.08);padding:2px 8px;border-radius:3px;font-size:0.85em">[${escapeHtml(img.text || `image:${idx}`)}]</span>`;
        }
        return `<img src="${esc(img.href)}" alt="${esc(img.text)}" style="max-height:1.5em;vertical-align:middle"/>`;
      }
      case 'link': {
        const link = token as Tokens.Link;
        return `<span style="color:#0066cc;text-decoration:underline">${renderInline(link.tokens, images)}</span>`;
      }
      case 'br':
        return '<br/>';
      case 'escape':
        return escapeHtml((token as Tokens.Escape).text);
      default:
        return 'raw' in token ? escapeHtml(String(token.raw)) : '';
    }
  }).join('');
}

// --- Helpers ---

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Average two hex colors and push toward white for a "patched over" look. */
function averageHexColors(a: string, b: string): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  try {
    const [r1, g1, b1] = parse(a);
    const [r2, g2, b2] = parse(b);
    // Average then push 80% toward white
    const boost = (x: number, y: number) => {
      const mid = (x + y) / 2;
      return Math.round(mid + (255 - mid) * 0.5).toString(16).padStart(2, '0');
    };
    return `#${boost(r1, r2)}${boost(g1, g2)}${boost(b1, b2)}`;
  } catch {
    return '#f0f0f0';
  }
}
