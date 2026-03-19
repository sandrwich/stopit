import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface AppSettings {
  openRouterApiKey: string;
  textModel: string;
  imageModel: string;
}

const DEFAULTS: AppSettings = {
  openRouterApiKey: '',
  textModel: 'anthropic/claude-opus-4.6',
  imageModel: 'google/gemini-3-pro-image-preview',
};

const STORAGE_KEY = 'stopit-settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
  hasApiKey: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  function updateSettings(partial: Partial<AppSettings>) {
    setSettings(prev => ({ ...prev, ...partial }));
  }

  function resetSettings() {
    setSettings({ ...DEFAULTS });
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, hasApiKey: !!settings.openRouterApiKey }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
