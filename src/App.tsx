import { MemeProvider } from './context/MemeContext.tsx';
import { SettingsProvider } from './context/SettingsContext.tsx';
import { HistoryProvider } from './context/HistoryContext.tsx';
import { ExportProvider } from './hooks/useExport.tsx';
import AppShell from './components/AppShell.tsx';
import EditorPanel from './components/editor/EditorPanel.tsx';
import PreviewPanel from './components/preview/PreviewPanel.tsx';

export default function App() {
  return (
    <SettingsProvider>
      <MemeProvider>
        <HistoryProvider>
          <ExportProvider>
            <AppShell
              editor={<EditorPanel />}
              preview={<PreviewPanel />}
            />
          </ExportProvider>
        </HistoryProvider>
      </MemeProvider>
    </SettingsProvider>
  );
}
