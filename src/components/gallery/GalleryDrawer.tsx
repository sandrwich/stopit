import { useState } from 'react';
import { X } from 'lucide-react';
import MemeGallery from './MemeGallery.tsx';
import ImageGallery from './ImageGallery.tsx';

interface GalleryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'memes' | 'images';

export default function GalleryDrawer({ isOpen, onClose }: GalleryDrawerProps) {
  const [tab, setTab] = useState<Tab>('memes');

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[420px] max-w-[calc(100vw-60px)] bg-white dark:bg-neutral-900 shadow-2xl flex flex-col transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('memes')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'memes'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Memes
            </button>
            <button
              onClick={() => setTab('images')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'images'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Images
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'memes' ? (
            <MemeGallery onClose={onClose} />
          ) : (
            <ImageGallery />
          )}
        </div>
      </div>
    </>
  );
}
