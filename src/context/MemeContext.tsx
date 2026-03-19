import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type { MemeManifest, ManifestImage } from '../types/manifest.ts';
import { createDefaultManifest } from '../lib/defaults.ts';

export type MemeAction =
  | { type: 'SET_MANIFEST'; payload: MemeManifest }
  | { type: 'UPDATE_CONTENT'; payload: string }
  | { type: 'UPDATE_BACKGROUND'; payload: Partial<MemeManifest['background']> }
  | { type: 'UPDATE_IMAGE'; index: number; payload: ManifestImage }
  | { type: 'ADD_IMAGE' }
  | { type: 'REMOVE_IMAGE'; index: number }
  | { type: 'UPDATE_CANVAS_WIDTH'; payload: number }
  | { type: 'RESET' };

function memeReducer(state: MemeManifest, action: MemeAction): MemeManifest {
  switch (action.type) {
    case 'SET_MANIFEST':
      return action.payload;

    case 'UPDATE_CONTENT':
      return { ...state, content: action.payload };

    case 'UPDATE_BACKGROUND':
      return { ...state, background: { ...state.background, ...action.payload } };

    case 'UPDATE_IMAGE': {
      const images = [...state.images];
      images[action.index] = action.payload;
      return { ...state, images };
    }

    case 'ADD_IMAGE':
      return { ...state, images: [...state.images, { src: '', alt: '', generationPrompt: '' }] };

    case 'REMOVE_IMAGE':
      return { ...state, images: state.images.filter((_, i) => i !== action.index) };

    case 'UPDATE_CANVAS_WIDTH':
      return { ...state, canvasWidth: action.payload };

    case 'RESET':
      return createDefaultManifest();

    default:
      return state;
  }
}

interface MemeContextValue {
  manifest: MemeManifest;
  dispatch: Dispatch<MemeAction>;
}

const MemeContext = createContext<MemeContextValue | null>(null);

export function MemeProvider({ children }: { children: ReactNode }) {
  const [manifest, dispatch] = useReducer(memeReducer, null, createDefaultManifest);

  return (
    <MemeContext.Provider value={{ manifest, dispatch }}>
      {children}
    </MemeContext.Provider>
  );
}

export function useMeme() {
  const ctx = useContext(MemeContext);
  if (!ctx) throw new Error('useMeme must be used within MemeProvider');
  return ctx;
}
