import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.tsx';
import { useHistory } from '../../context/HistoryContext.tsx';
import { generateImage, type OpenRouterConfig } from '../../lib/openrouter.ts';
import { storeImage } from '../../lib/idb.ts';
import type { ManifestImage } from '../../types/manifest.ts';

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  index: number;
  image: ManifestImage;
  onAccept: (image: ManifestImage) => void;
}

export default function RegenerateModal({ isOpen, onClose, index, image, onAccept }: RegenerateModalProps) {
  const { settings, hasApiKey } = useSettings();
  const { refreshImages } = useHistory();

  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrompt(image.generationPrompt ?? '');
      const initial = image.src ? [image.src] : [];
      setHistory(initial);
      setSelectedIndex(initial.length > 0 ? 0 : null);
      setError('');
      setGenerating(false);
    }
  }, [isOpen, index, image.src, image.generationPrompt]);

  if (!isOpen) return null;

  const config: OpenRouterConfig = {
    apiKey: settings.openRouterApiKey,
    textModel: settings.textModel,
    imageModel: settings.imageModel,
  };

  const candidate = selectedIndex !== null && selectedIndex > 0 ? history[selectedIndex] : null;
  const candidateChanged = candidate && candidate !== image.src;

  async function handleGenerate() {
    if (generating || !prompt.trim() || !hasApiKey) return;
    setGenerating(true);
    setError('');

    try {
      const dataUrl = await generateImage(config, prompt);
      await storeImage(dataUrl);
      refreshImages().catch(() => {});

      setHistory(prev => {
        const next = [...prev, dataUrl];
        setSelectedIndex(next.length - 1);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function handleAccept() {
    if (candidate) {
      onAccept({ src: candidate, alt: image.alt, generationPrompt: prompt });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-[680px] max-w-[calc(100vw-40px)] max-h-[90vh] overflow-y-auto text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-sm font-semibold">Regenerate image:{index}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Prompt */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate(); }}
              placeholder="Describe the image to generate..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono resize-y"
            />
          </div>

          {/* History thumbnails */}
          {history.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                Generations ({history.length})
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {history.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={`w-12 h-12 shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                      selectedIndex === i
                        ? 'border-purple-500 ring-1 ring-purple-500/30'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-purple-300'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                {generating && (
                  <div className="w-12 h-12 shrink-0 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin text-purple-400" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current */}
            <div>
              <label className="block text-[10px] font-medium text-neutral-400 mb-1 uppercase tracking-wide">Current</label>
              <div className="aspect-square rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 overflow-hidden flex items-center justify-center">
                {image.src ? (
                  <img src={image.src} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-neutral-400">No image yet</span>
                )}
              </div>
            </div>

            {/* Candidate */}
            <div>
              <label className="block text-[10px] font-medium text-neutral-400 mb-1 uppercase tracking-wide">
                {generating ? 'Generating...' : candidate ? 'Selected' : 'New'}
              </label>
              <div className="aspect-square rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 overflow-hidden flex items-center justify-center">
                {generating && !candidate ? (
                  <Loader2 size={24} className="animate-spin text-purple-400" />
                ) : candidate ? (
                  <img src={candidate} alt="" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center px-4">
                    <Sparkles size={20} className="mx-auto mb-1.5 text-purple-400" />
                    <span className="text-xs text-neutral-400">Click Generate to create an image</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim() || !hasApiKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generate New
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Close
            </button>
            <button
              onClick={handleAccept}
              disabled={!candidateChanged}
              className="px-4 py-2 text-sm font-medium rounded-md bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use This Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
