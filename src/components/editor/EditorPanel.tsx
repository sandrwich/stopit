import { useState, useRef, useEffect } from 'react';
import { useMeme } from '../../context/MemeContext.tsx';
import Collapsible from '../shared/Collapsible.tsx';
import ColorPicker from '../shared/ColorPicker.tsx';
import ContentEditor from './ContentEditor.tsx';
import ImageField from './ImageField.tsx';
import RegenerateModal from './RegenerateModal.tsx';
import ManifestPanel from './ManifestPanel.tsx';
import AiBar from './AiBar.tsx';
import { Plus, Sparkles } from 'lucide-react';
import { DEFAULT_FILTERS } from '../../types/manifest.ts';

const DIRECTIONS = [
  { value: 'to top left', label: '↖ Bottom-right to Top-left' },
  { value: 'to top', label: '↑ Bottom to Top' },
  { value: 'to bottom', label: '↓ Top to Bottom' },
  { value: 'to right', label: '→ Left to Right' },
  { value: 'to bottom right', label: '↘ Top-left to Bottom-right' },
] as const;

export default function EditorPanel() {
  const { manifest, dispatch } = useMeme();
  const [activePromptIndex, setActivePromptIndex] = useState<number | null>(null);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);

  return (
    <div>
      <AiBar />

      {/* Content — WYSIWYG markdown editor */}
      <Collapsible title="Content">
        <ContentEditor
          markdown={manifest.content}
          onChange={md => dispatch({ type: 'UPDATE_CONTENT', payload: md })}
          imageCount={manifest.images.length}
        />
        <p className="mt-1.5 text-xs text-neutral-400">
          <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">![label](image:N)</code> for image refs.
          Last paragraph auto-styled bold as closing line.
        </p>
      </Collapsible>

      {/* Images */}
      <Collapsible
        title={`Images (${manifest.images.length})`}
        actions={
          <button
            onClick={() => dispatch({ type: 'ADD_IMAGE' })}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
            title="Add image slot"
          >
            <Plus size={14} />
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {manifest.images.map((img, i) => (
            <ImageField
              key={i}
              index={i}
              image={img}
              onImageChange={updated => dispatch({ type: 'UPDATE_IMAGE', index: i, payload: updated })}
              onRemove={manifest.images.length > 1 ? () => dispatch({ type: 'REMOVE_IMAGE', index: i }) : undefined}
              promptActive={activePromptIndex === i}
              onTogglePrompt={() => setActivePromptIndex(prev => prev === i ? null : i)}
              onRegenerate={() => setRegenIndex(i)}
            />
          ))}
        </div>

        {/* Full-width prompt editor for the selected image */}
        {activePromptIndex !== null && manifest.images[activePromptIndex] && (
          <div className="mt-2 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-purple-500" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                AI prompt for image:{activePromptIndex}
              </span>
            </div>
            <textarea
              value={manifest.images[activePromptIndex].generationPrompt ?? ''}
              onChange={e => {
                const img = manifest.images[activePromptIndex];
                dispatch({ type: 'UPDATE_IMAGE', index: activePromptIndex, payload: { ...img, generationPrompt: e.target.value } });
              }}
              placeholder="Describe the image you want AI to generate..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-800 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono resize-y"
            />
          </div>
        )}

        <p className="mt-2 text-xs text-neutral-400">
          Reference in content as <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">![label text](image:0)</code>
        </p>
      </Collapsible>

      {/* Background */}
      <Collapsible title="Background" defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex gap-4">
            <ColorPicker
              label="From"
              value={manifest.background.from}
              onChange={from => dispatch({ type: 'UPDATE_BACKGROUND', payload: { from } })}
            />
            <ColorPicker
              label="To"
              value={manifest.background.to}
              onChange={to => dispatch({ type: 'UPDATE_BACKGROUND', payload: { to } })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Direction</label>
            <select
              value={manifest.background.direction}
              onChange={e => dispatch({ type: 'UPDATE_BACKGROUND', payload: { direction: e.target.value as typeof manifest.background.direction } })}
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DIRECTIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Collapsible>

      {/* Filters */}
      <Collapsible title="Filters" defaultOpen={false}>
        {(() => {
          const f = manifest.filters ?? DEFAULT_FILTERS;
          return (
            <div className="space-y-3">
              <FilterSlider
                label="JPEG Quality"
                hintFn={v => v >= 100 ? 'Lossless PNG' : `${v}% — ${v < 40 ? 'deep fried' : v < 70 ? 'crunchy' : 'mild'}`}
                value={f.jpegQuality}
                min={1} max={100}
                onChange={v => dispatch({ type: 'UPDATE_FILTERS', payload: { jpegQuality: v } })}
              />
              <FilterSlider
                label="Messiness"
                hintFn={v => v === 0 ? 'Clean' : `${v}% — ${v > 60 ? 'chaotic' : v > 30 ? 'wobbly' : 'subtle'}`}
                value={f.textMessiness}
                min={0} max={100}
                onChange={v => dispatch({ type: 'UPDATE_FILTERS', payload: { textMessiness: v } })}
              />
              <FilterSlider
                label="Crustiness"
                hintFn={v => v === 0 ? 'None' : `${v}% — ${v > 60 ? 'deep fried' : v > 30 ? 'toasted' : 'slight'}`}
                value={f.crustiness}
                min={0} max={100}
                onChange={v => dispatch({ type: 'UPDATE_FILTERS', payload: { crustiness: v } })}
              />
            </div>
          );
        })()}
      </Collapsible>

      {/* Manifest JSON */}
      <ManifestPanel />

      {/* Regenerate modal */}
      {regenIndex !== null && manifest.images[regenIndex] && (
        <RegenerateModal
          isOpen
          onClose={() => setRegenIndex(null)}
          index={regenIndex}
          image={manifest.images[regenIndex]}
          onAccept={updated => {
            dispatch({ type: 'UPDATE_IMAGE', index: regenIndex, payload: updated });
            setRegenIndex(null);
          }}
        />
      )}
    </div>
  );
}

function FilterSlider({ label, hintFn, value, min, max, onChange }: {
  label: string; hintFn: (v: number) => string; value: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  const dragging = useRef(false);

  // Sync from parent when not dragging
  useEffect(() => {
    if (!dragging.current) setLocal(value);
  }, [value]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
        <span className="text-[10px] text-neutral-400">{hintFn(local)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} value={local}
        onChange={e => { dragging.current = true; setLocal(Number(e.target.value)); }}
        onMouseUp={() => { dragging.current = false; onChange(local); }}
        onTouchEnd={() => { dragging.current = false; onChange(local); }}
        className="w-full h-1.5 rounded-full appearance-none bg-neutral-200 dark:bg-neutral-700 accent-purple-500"
      />
    </div>
  );
}
