// First: move data stored under the app's earlier names to the new keys.
import './lib/storageKeys';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppCrash, ErrorBoundary } from './components/ErrorBoundary';
import { applyTheme } from './lib/theme';
import { loadSettings } from './lib/storage';
import { initPwa } from './lib/pwa';
import { initTabGuard } from './lib/tabGuard';
import { requestPersistence } from './lib/dataSafety';
import './index.css';

// Theme before the first paint — no dark flash for light-theme users.
applyTheme(loadSettings().theme);

// One active window: a new one takes over, older ones save and turn read-only.
initTabGuard();

// Ask the browser not to clear our data when space runs low.
void requestPersistence();

// Installable app and offline mode (service worker in production builds).
initPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={(error) => <AppCrash error={error} />}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
