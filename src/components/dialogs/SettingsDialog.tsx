import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext.tsx';
import { X, Eye, EyeOff } from 'lucide-react';

const INPUT = "w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { settings, updateSettings, resetSettings, connectOpenRouter } = useSettings();
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-[440px] max-h-[80vh] overflow-y-auto text-neutral-900 dark:text-neutral-100"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">OpenRouter API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.openRouterApiKey}
                onChange={e => updateSettings({ openRouterApiKey: e.target.value })}
                placeholder="sk-or-..."
                className={`flex-1 ${INPUT}`}
              />
              <button
                onClick={() => setShowKey(s => !s)}
                className="px-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={connectOpenRouter}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-500 text-white hover:bg-purple-600"
              >
                Connect with OpenRouter
              </button>
              <span className="text-xs text-neutral-400">or paste a key from <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-blue-500 underline">openrouter.ai/keys</a></span>
            </div>
          </div>

          {/* Text model */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Text Model</label>
            <input
              type="text"
              value={settings.textModel}
              onChange={e => updateSettings({ textModel: e.target.value })}
              placeholder="anthropic/claude-opus-4.6"
              className={INPUT}
            />
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Any OpenRouter model slug. Used for meme text generation.
            </p>
          </div>

          {/* Image model */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Image Model</label>
            <input
              type="text"
              value={settings.imageModel}
              onChange={e => updateSettings({ imageModel: e.target.value })}
              placeholder="google/gemini-3-pro-image-preview"
              className={INPUT}
            />
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Used for generating the 3 embedded images.
            </p>
          </div>
        </div>

        <div className="flex justify-between px-5 py-3 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={resetSettings}
            className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Reset to defaults
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
