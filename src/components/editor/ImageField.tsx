import { useRef, useState } from 'react';
import type { ManifestImage } from '../../types/manifest.ts';
import { ImagePlus, X, Trash2, Sparkles, RefreshCw } from 'lucide-react';

interface ImageFieldProps {
  index: number;
  image: ManifestImage;
  onImageChange: (image: ManifestImage) => void;
  onRemove?: () => void;
  promptActive?: boolean;
  onTogglePrompt?: () => void;
  onRegenerate?: () => void;
}

export default function ImageField({ index, image, onImageChange, onRemove, promptActive, onTogglePrompt, onRegenerate }: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      onImageChange({ ...image, src: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleFile(file);
        return;
      }
    }
  }

  return (
    <div className={`rounded-lg border bg-neutral-50 dark:bg-neutral-900/50 overflow-hidden transition-colors ${
      promptActive
        ? 'border-purple-300 dark:border-purple-800'
        : 'border-neutral-200 dark:border-neutral-800'
    }`}>
      {/* Drop zone / thumbnail */}
      <div
        onClick={() => !image.src && fileRef.current?.click()}
        onPaste={handlePaste}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f?.type.startsWith('image/')) handleFile(f);
        }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        tabIndex={0}
        className={`relative group h-32 flex items-center justify-center transition-colors ${
          image.src ? 'bg-neutral-100 dark:bg-neutral-950' : 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800'
        } ${dragOver ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/30' : ''}`}
      >
        {image.src ? (
          <>
            <img src={image.src} alt={image.alt} className="max-h-full max-w-full object-contain" />
            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              {onRegenerate && image.generationPrompt && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                  className="p-2 rounded-lg bg-white/90 dark:bg-neutral-800/90 text-purple-600 hover:bg-white dark:hover:bg-neutral-700 shadow-sm"
                  title="Regenerate"
                >
                  <RefreshCw size={16} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                className="p-2 rounded-lg bg-white/90 dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 shadow-sm"
                title="Replace image"
              >
                <ImagePlus size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onImageChange({ ...image, src: '' }); }}
                className="p-2 rounded-lg bg-white/90 dark:bg-neutral-800/90 text-red-500 hover:bg-white dark:hover:bg-neutral-700 shadow-sm"
                title="Clear image"
              >
                <X size={16} />
              </button>
            </div>
          </>
        ) : image.generationPrompt ? (
          /* Show prompt as card content when waiting for generation */
          <div className="absolute inset-0 p-2.5 flex flex-col bg-purple-50 dark:bg-purple-950/20">
            <Sparkles size={12} className="text-purple-400 shrink-0 mb-1" />
            <p className="text-[11px] leading-snug text-purple-700 dark:text-purple-300 line-clamp-4 flex-1">
              {image.generationPrompt}
            </p>
            <span className="text-[10px] text-purple-400 mt-1">click to upload instead</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-neutral-400">
            <ImagePlus size={24} />
            <span className="text-xs">Drop, paste, or click</span>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        className="hidden"
      />

      {/* Bottom bar: label + actions */}
      <div className="px-2.5 py-1.5 flex items-center gap-1.5 border-t border-neutral-200 dark:border-neutral-800">
        <span className="text-[11px] font-mono text-neutral-400 flex-1">image:{index}</span>
        {onRegenerate && image.generationPrompt && (
          <button
            onClick={onRegenerate}
            className="p-1 rounded text-purple-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
            title="Regenerate image"
          >
            <RefreshCw size={13} />
          </button>
        )}
        {onTogglePrompt && (
          <button
            onClick={onTogglePrompt}
            className={`p-1 rounded transition-colors ${
              promptActive
                ? 'text-purple-500 bg-purple-50 dark:bg-purple-950/30'
                : image.generationPrompt
                  ? 'text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                  : 'text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
            title="AI generation prompt"
          >
            <Sparkles size={13} />
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Remove slot"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
