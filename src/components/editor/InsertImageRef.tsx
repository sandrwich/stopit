import { useState } from 'react';
import { usePublisher } from '@mdxeditor/editor';
import { insertMarkdown$ } from '@mdxeditor/editor';
import { ImagePlus } from 'lucide-react';

interface InsertImageRefProps {
  imageCount: number;
}

export default function InsertImageRef({ imageCount }: InsertImageRefProps) {
  const insertMarkdown = usePublisher(insertMarkdown$);
  const [open, setOpen] = useState(false);

  function insert(index: number) {
    insertMarkdown(`![label](image:${index})`);
    setOpen(false);
  }

  function insertRow() {
    const refs = Array.from({ length: imageCount }, (_, i) => `![](image:${i})`).join(' ');
    insertMarkdown(refs);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Insert image reference"
        className="flex items-center gap-1 px-1.5 py-1 rounded text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <ImagePlus size={15} />
        <span className="text-[10px] font-mono">img:N</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-2 min-w-[160px]">
            <button
              onClick={insertRow}
              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 font-medium"
            >
              Insert all as row ({imageCount})
            </button>
            <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
            {Array.from({ length: imageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => insert(i)}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 font-mono"
              >
                ![label](image:{i})
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
