import { useState } from 'react';
import { useMeme } from '../../context/MemeContext.tsx';
import type { MemeManifest } from '../../types/manifest.ts';
import Collapsible from '../shared/Collapsible.tsx';
import { Copy, Check, Download, Upload } from 'lucide-react';

export default function ManifestPanel() {
  const { manifest, dispatch } = useMeme();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editJson, setEditJson] = useState('');
  const [error, setError] = useState('');

  const json = JSON.stringify(manifest, null, 2);

  async function handleCopy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stopit-meme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as MemeManifest;
        if (!parsed.content || !parsed.version) throw new Error('Invalid manifest');
        dispatch({ type: 'SET_MANIFEST', payload: parsed });
      } catch (e) {
        setError(`Import failed: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
        setTimeout(() => setError(''), 3000);
      }
    };
    input.click();
  }

  function startEditing() {
    setEditJson(json);
    setEditing(true);
    setError('');
  }

  function applyEdit() {
    try {
      const parsed = JSON.parse(editJson) as MemeManifest;
      if (!parsed.content || !parsed.version) throw new Error('Invalid manifest — missing content or version');
      dispatch({ type: 'SET_MANIFEST', payload: parsed });
      setEditing(false);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }

  return (
    <Collapsible
      title="Manifest JSON"
      defaultOpen={false}
      actions={
        <div className="flex gap-1">
          <button onClick={handleCopy} className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Copy JSON">
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
          <button onClick={handleDownload} className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Download JSON">
            <Download size={14} />
          </button>
          <button onClick={handleImport} className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Import JSON">
            <Upload size={14} />
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">{error}</div>
      )}

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editJson}
            onChange={e => setEditJson(e.target.value)}
            rows={16}
            className="w-full text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded p-3 font-mono text-neutral-700 dark:text-neutral-300 resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button onClick={applyEdit} className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">Apply</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs border border-neutral-300 rounded hover:bg-neutral-50">Cancel</button>
          </div>
        </div>
      ) : (
        <pre
          onClick={startEditing}
          className="text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded p-3 overflow-auto max-h-80 font-mono text-neutral-700 dark:text-neutral-300 cursor-pointer hover:border-blue-300 transition-colors"
          title="Click to edit"
        >
          {json}
        </pre>
      )}
    </Collapsible>
  );
}
