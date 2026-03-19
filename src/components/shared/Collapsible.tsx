import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapsibleProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  actions?: ReactNode;
}

export default function Collapsible({ title, children, defaultOpen = true, actions }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900">
        <div
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-2 cursor-pointer select-none"
        >
          <ChevronRight
            size={14}
            className={`transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}
          />
          <span>{title}</span>
        </div>
        {actions && (
          <div className="flex items-center gap-1">
            {actions}
          </div>
        )}
      </div>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}
