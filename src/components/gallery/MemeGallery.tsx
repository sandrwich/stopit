import { useState, useMemo } from 'react';
import { useHistory } from '../../context/HistoryContext.tsx';
import { Star, Trash2, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { renderMemeMarkdown } from '../../lib/markdown.ts';
import type { SnapshotListItem } from '../../types/manifest.ts';

interface MemeGalleryProps {
  onClose: () => void;
}

export default function MemeGallery({ onClose }: MemeGalleryProps) {
  const { snapshots, loading, restoreSnapshot, deleteSnapshot, toggleFavorite } = useHistory();
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filtered = filter === 'favorites'
    ? snapshots.filter(s => s.favorite)
    : snapshots;

  const groups = useMemo(() => {
    const map = new Map<string, SnapshotListItem[]>();
    for (const snap of filtered) {
      const key = snap.heading || 'Untitled';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(snap);
    }
    // Sort groups by most recent item
    return Array.from(map.entries())
      .map(([heading, items]) => ({ heading, items }))
      .sort((a, b) => b.items[0].createdAt - a.items[0].createdAt);
  }, [filtered]);

  function handleRestore(id: string) {
    restoreSnapshot(id);
    onClose();
  }

  function handleDelete(id: string) {
    if (confirmDelete === id) {
      deleteSnapshot(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  }

  function toggleGroup(heading: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-neutral-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Filter bar */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 text-xs rounded-md ${
            filter === 'all'
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          All ({snapshots.length})
        </button>
        <button
          onClick={() => setFilter('favorites')}
          className={`px-2.5 py-1 text-xs rounded-md ${
            filter === 'favorites'
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Favorites ({snapshots.filter(s => s.favorite).length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-neutral-400">
          {filter === 'favorites' ? 'No favorites yet' : 'No saved memes yet'}
          <p className="text-xs mt-1">Generate a meme or click Save to create a snapshot</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const collapsed = collapsedGroups.has(group.heading);
            return (
              <div key={group.heading}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.heading)}
                  className="flex items-center gap-1.5 w-full text-left mb-1.5 group/hdr"
                >
                  <ChevronRight
                    size={12}
                    className={`text-neutral-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
                  />
                  <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 truncate flex-1">
                    {group.heading}
                  </span>
                  <span className="text-[10px] text-neutral-400">{group.items.length}</span>
                </button>

                {/* Cards */}
                {!collapsed && (
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map(snap => (
                      <SnapshotCard
                        key={snap.id}
                        snap={snap}
                        confirmDelete={confirmDelete === snap.id}
                        onRestore={() => handleRestore(snap.id)}
                        onDelete={() => handleDelete(snap.id)}
                        onToggleFavorite={() => toggleFavorite(snap.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SnapshotCard({
  snap,
  confirmDelete,
  onRestore,
  onDelete,
  onToggleFavorite,
}: {
  snap: SnapshotListItem;
  confirmDelete: boolean;
  onRestore: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const scale = 190 / snap.canvasWidth; // ~190px card width in the 2-col grid
  const html = useMemo(
    () => renderMemeMarkdown(snap.content, [], snap.canvasWidth),
    [snap.content, snap.canvasWidth],
  );

  return (
    <div className="group rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
      {/* Mini meme canvas */}
      <div
        onClick={onRestore}
        className="h-28 relative overflow-hidden"
      >
        <div
          style={{
            width: snap.canvasWidth,
            background: `linear-gradient(${snap.background.direction}, ${snap.background.from}, ${snap.background.to})`,
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
            color: '#000',
            padding: '40px 50px',
            boxSizing: 'border-box',
            lineHeight: 1.4,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {snap.imageCount > 0 && (
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/40 text-white text-[10px]">
            <ImageIcon size={10} />
            {snap.imageCount}
          </span>
        )}
      </div>

      {/* Info bar */}
      <div className="px-2.5 py-2 bg-white dark:bg-neutral-900">
        <p onClick={onRestore} className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate" title={snap.label}>
          {snap.label}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-neutral-400">
            {formatRelativeDate(snap.createdAt)}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={`p-1 rounded transition-colors ${
                snap.favorite
                  ? 'text-yellow-500'
                  : 'text-neutral-300 dark:text-neutral-600 hover:text-yellow-500'
              }`}
              title={snap.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={12} fill={snap.favorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className={`p-1 rounded transition-colors ${
                confirmDelete
                  ? 'text-red-500 bg-red-50 dark:bg-red-950/30'
                  : 'text-neutral-300 dark:text-neutral-600 hover:text-red-500'
              }`}
              title={confirmDelete ? 'Click again to confirm' : 'Delete'}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
