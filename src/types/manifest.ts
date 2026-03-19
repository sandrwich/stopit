export interface MemeManifest {
  version: 1;
  canvasWidth: number;

  background: {
    from: string;
    to: string;
    direction: string;
  };

  /** Filters to make the meme look more authentic */
  filters?: MemeFilters;

  /** The entire meme as markdown. Images referenced as ![label](image:0) */
  content: string;

  /** Images referenced by index from the markdown */
  images: ManifestImage[];
}

export interface MemeFilters {
  /** JPEG quality on export (1-100, 100 = lossless PNG). Default 100 */
  jpegQuality: number;
  /** Text messiness — slight random size/position variation (0-100). Default 0 */
  textMessiness: number;
  /** Overall image quality degradation — blur + contrast (0-100). Default 0 */
  crustiness: number;
}

export const DEFAULT_FILTERS: MemeFilters = {
  jpegQuality: 100,
  textMessiness: 70,
  crustiness: 20,
};

export interface ManifestImage {
  src: string;
  alt: string;
  generationPrompt?: string;
}

export const EMPTY_IMAGE: ManifestImage = { src: '', alt: '', generationPrompt: '' };

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ── IndexedDB persistence types ──

/** Image stored with hash as dataUrl, separate from manifests */
export interface SnapshotImage {
  hash: string;
  alt: string;
  generationPrompt?: string;
}

/** Manifest as stored in IDB — images replaced with hashes */
export interface SnapshotManifest {
  version: 1;
  canvasWidth: number;
  background: MemeManifest['background'];
  filters?: MemeFilters;
  content: string;
  images: SnapshotImage[];
}

/** Full snapshot record in IDB */
export interface SnapshotRecord {
  id: string;
  manifest: SnapshotManifest;
  label: string;
  createdAt: number;
  favorite: 0 | 1;
}

/** Lightweight snapshot for gallery listing (no full manifest) */
export interface SnapshotListItem {
  id: string;
  label: string;
  heading: string;
  content: string;
  createdAt: number;
  favorite: boolean;
  imageCount: number;
  background: MemeManifest['background'];
  canvasWidth: number;
}

/** Image record in IDB */
export interface ImageRecord {
  hash: string;
  dataUrl: string;
  byteSize: number;
  createdAt: number;
}
