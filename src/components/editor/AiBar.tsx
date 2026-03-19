import { useState } from 'react';
import { Sparkles, Send, Loader2, AlertCircle, ImagePlus } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.tsx';
import { useMeme } from '../../context/MemeContext.tsx';
import { useHistory } from '../../context/HistoryContext.tsx';
import { chatCompletion, generateImage, type OpenRouterConfig } from '../../lib/openrouter.ts';
import { SYSTEM_PROMPT, buildGeneratePrompt, buildRefinePrompt, generatedJsonToMarkdown } from '../../lib/prompts.ts';
import { saveSnapshot as idbSaveSnapshot, updateSnapshot as idbUpdateSnapshot } from '../../lib/idb.ts';
import type { AiMessage, MemeManifest } from '../../types/manifest.ts';

/** Strip markdown code fences and extract JSON */
function parseJsonResponse(raw: string): unknown {
  let text = raw.trim();
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) text = fenceMatch[1].trim();
  return JSON.parse(text);
}

type Phase = 'idle' | 'generating-text' | 'generating-images' | 'refining' | 'error';

export default function AiBar() {
  const { settings, hasApiKey } = useSettings();
  const { manifest, dispatch } = useMeme();
  const { refreshSnapshots, refreshImages } = useHistory();

  const [topic, setTopic] = useState('');
  const [refineInput, setRefineInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [lastSnapshotId, setLastSnapshotId] = useState<string | null>(null);

  if (!hasApiKey) {
    return (
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        <p className="text-xs text-neutral-400 flex items-center gap-1.5">
          <Sparkles size={13} />
          Set your OpenRouter API key in Settings to enable AI generation.
        </p>
      </div>
    );
  }

  const config: OpenRouterConfig = {
    apiKey: settings.openRouterApiKey,
    textModel: settings.textModel,
    imageModel: settings.imageModel,
  };

  const busy = phase !== 'idle' && phase !== 'error';

  // Check if current manifest has empty image slots with generation prompts
  const hasUngenerated = manifest.images.some(img => !img.src && img.generationPrompt);

  /** Save a manifest snapshot to IDB. Returns the snapshot ID. */
  async function autoSave(m: MemeManifest, label: string): Promise<string | undefined> {
    try {
      const id = await idbSaveSnapshot(m, label);
      await Promise.all([refreshSnapshots(), refreshImages()]);
      return id;
    } catch { return undefined; }
  }

  /** Update an existing snapshot's manifest (e.g. after adding images). */
  function autoUpdate(id: string, m: MemeManifest) {
    idbUpdateSnapshot(id, m)
      .then(() => Promise.all([refreshSnapshots(), refreshImages()]))
      .catch(() => {});
  }

  async function handleGenerate() {
    if (!topic.trim() || busy) return;
    setError('');
    setPhase('generating-text');
    addMessage('user', `Generate meme about: ${topic}`);

    try {
      const response = await chatCompletion(
        config,
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildGeneratePrompt(topic) },
        ],
        true,
      );

      const json = parseJsonResponse(response) as any;
      const markdown = generatedJsonToMarkdown(json);
      const imagePrompts: string[] = json.imagePrompts ?? [];
      const images = imagePrompts.map((prompt: string, i: number) => ({
        src: '',
        alt: json.imageLabels?.[i] ?? '',
        generationPrompt: prompt,
      }));

      const newManifest = { ...manifest, content: markdown, images };
      dispatch({ type: 'SET_MANIFEST', payload: newManifest });

      addMessage('assistant', `Generated meme text for "${topic}"`);
      if (imagePrompts.length > 0) {
        addMessage('assistant', `${imagePrompts.length} image prompts ready — click "Generate Images" when you're happy with the text`);
      }

      const snapId = await autoSave(newManifest, `AI: ${topic}`);
      setLastSnapshotId(snapId ?? null);
      setPhase('idle');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      setError(msg);
      setPhase('error');
      addMessage('assistant', `Error: ${msg}`);
    }
  }

  async function handleGenerateImages() {
    if (busy) return;
    const toGenerate = manifest.images
      .map((img, i) => ({ img, i }))
      .filter(({ img }) => !img.src && img.generationPrompt);

    if (toGenerate.length === 0) return;

    setError('');
    setPhase('generating-images');
    addMessage('user', `Generate ${toGenerate.length} images`);

    try {
      const results = await Promise.allSettled(
        toGenerate.map(({ img }) => generateImage(config, img.generationPrompt!)),
      );

      const errors: string[] = [];
      const updatedImages = [...manifest.images];
      results.forEach((result, ri) => {
        const { i } = toGenerate[ri];
        if (result.status === 'fulfilled') {
          updatedImages[i] = { ...updatedImages[i], src: result.value };
          dispatch({
            type: 'UPDATE_IMAGE',
            index: i,
            payload: { ...updatedImages[i] },
          });
        } else {
          errors.push(`image:${i}: ${result.reason?.message ?? 'failed'}`);
        }
      });

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      addMessage('assistant', `Generated ${succeeded}/${toGenerate.length} images`);
      if (errors.length > 0) {
        addMessage('assistant', `Image errors: ${errors.join('; ')}`);
      }

      const updatedManifest = { ...manifest, images: updatedImages };
      if (lastSnapshotId) {
        autoUpdate(lastSnapshotId, updatedManifest);
      } else {
        autoSave(updatedManifest, `Images generated`);
      }
      setPhase('idle');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Image generation failed';
      setError(msg);
      setPhase('error');
      addMessage('assistant', `Error: ${msg}`);
    }
  }

  async function handleRefine() {
    if (!refineInput.trim() || busy) return;
    setError('');
    setPhase('refining');
    const instruction = refineInput;
    setRefineInput('');
    addMessage('user', instruction);

    try {
      const response = await chatCompletion(
        config,
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildRefinePrompt(manifest.content, instruction) },
        ],
        true,
      );

      const json = parseJsonResponse(response) as any;
      const markdown = generatedJsonToMarkdown(json);
      const imagePrompts: string[] = json.imagePrompts ?? [];
      const images = imagePrompts.map((prompt: string, i: number) => ({
        src: manifest.images[i]?.src ?? '',
        alt: json.imageLabels?.[i] ?? '',
        generationPrompt: prompt,
      }));

      const newManifest = { ...manifest, content: markdown, images };
      dispatch({ type: 'SET_MANIFEST', payload: newManifest });

      addMessage('assistant', 'Updated meme content');
      autoSave(newManifest, `Refine: ${instruction.slice(0, 40)}`);
      setPhase('idle');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Refinement failed';
      setError(msg);
      setPhase('error');
      addMessage('assistant', `Error: ${msg}`);
    }
  }

  function addMessage(role: 'user' | 'assistant', content: string) {
    setMessages(prev => [...prev.slice(-10), { role, content, timestamp: Date.now() }]);
  }

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
      <div className="px-4 py-3 space-y-2">
        {/* Generate from topic */}
        <div className="flex gap-2">
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="Enter a topic... (e.g. Machine Learning)"
            disabled={busy}
            className="flex-1 px-3 py-1.5 text-sm border border-purple-200 dark:border-purple-800 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            onClick={handleGenerate}
            disabled={busy || !topic.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === 'generating-text' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Generate
          </button>
        </div>

        {/* Refine */}
        {(messages.length > 0 || manifest.content.trim()) && (
          <div className="flex gap-2">
            <input
              type="text"
              value={refineInput}
              onChange={e => setRefineInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRefine()}
              placeholder="Refine: make bullets more absurd, change topic..."
              disabled={busy}
              className="flex-1 px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleRefine}
              disabled={busy || !refineInput.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === 'refining' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Refine
            </button>
          </div>
        )}

        {/* Generate images CTA */}
        {hasUngenerated && phase !== 'generating-images' && (
          <button
            onClick={handleGenerateImages}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
          >
            <ImagePlus size={14} />
            Generate {manifest.images.filter(img => !img.src && img.generationPrompt).length} Images
          </button>
        )}

        {/* Status / errors */}
        {phase === 'generating-images' && (
          <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Generating images...
          </p>
        )}

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
            <button onClick={() => { setError(''); setPhase('idle'); }} className="ml-1 underline">dismiss</button>
          </p>
        )}

        {/* Mini chat history */}
        {messages.length > 0 && (
          <div className="max-h-24 overflow-y-auto space-y-0.5">
            {messages.slice(-5).map((msg, i) => (
              <p key={i} className={`text-xs truncate ${msg.role === 'user' ? 'text-neutral-600 dark:text-neutral-400' : 'text-purple-600 dark:text-purple-400'}`}>
                {msg.role === 'user' ? '→' : '✓'} {msg.content}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
