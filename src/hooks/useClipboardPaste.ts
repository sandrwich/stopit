import { useEffect } from 'react';

export function useClipboardPaste(onPaste: (dataUrl: string) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            onPaste(reader.result as string);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onPaste, enabled]);
}
