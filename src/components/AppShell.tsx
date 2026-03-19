import { useState, useRef, useCallback, type ReactNode } from 'react';
import { Settings, Download, Upload, ImageDown, Loader2, Clock, Bookmark } from 'lucide-react';
import { useExport } from '../hooks/useExport.tsx';
import { useMeme } from '../context/MemeContext.tsx';
import { useHistory } from '../context/HistoryContext.tsx';
import type { MemeManifest } from '../types/manifest.ts';
import SettingsDialog from './dialogs/SettingsDialog.tsx';
import GalleryDrawer from './gallery/GalleryDrawer.tsx';

interface AppShellProps {
  editor: ReactNode;
  preview: ReactNode;
}

export default function AppShell({ editor, preview }: AppShellProps) {
  const { exportToPng, exporting } = useExport();
  const { manifest, dispatch } = useMeme();
  const { saveSnapshot } = useHistory();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => Math.round(window.innerWidth * 0.4));
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const newWidth = Math.max(320, Math.min(ev.clientX, window.innerWidth - 320));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  function handleDownloadJson() {
    const json = JSON.stringify(manifest, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stopit-meme.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as MemeManifest;
        if (!parsed.content || !parsed.version) throw new Error('Invalid');
        dispatch({ type: 'SET_MANIFEST', payload: parsed });
      } catch {
        alert('Invalid manifest JSON');
      }
    };
    input.click();
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSnapshot();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <header className="h-12 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 shrink-0">
        <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 group/logo cursor-default select-none">
          s<span className="inline-flex justify-center" style={{ width: '0.42em' }}>
            <span className="transition-opacity duration-1000 group-hover/logo:opacity-0">t</span>
            <span className="absolute opacity-0 transition-opacity duration-500 group-hover/logo:opacity-100">l</span>
          </span>op<span className="text-red-500">it</span>
        </h1>

        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 disabled:opacity-50"
            title="Save snapshot"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={() => setGalleryOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            title="Meme gallery & history"
          >
            <Clock size={14} />
            <span className="hidden sm:inline">Gallery</span>
          </button>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800 mx-1" />

          <button
            onClick={handleImportJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            title="Import manifest JSON"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            title="Download manifest JSON"
          >
            <Download size={14} />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800 mx-1" />

          <button
            onClick={exportToPng}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            title="Export as PNG"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <ImageDown size={14} />}
            <span>Export PNG</span>
          </button>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800 mx-1" />

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Split pane */}
      <div className="flex-1 flex min-h-0">
        <div
          className="shrink-0 overflow-y-auto"
          style={{ width: sidebarWidth }}
        >
          {editor}
        </div>
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1 shrink-0 cursor-col-resize bg-neutral-200 dark:bg-neutral-800 hover:bg-blue-400 dark:hover:bg-blue-600 active:bg-blue-500 transition-colors"
        />
        <div className="flex-1 min-w-0 relative">
          {preview}
        </div>
      </div>

      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GalleryDrawer isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </div>
  );
}
