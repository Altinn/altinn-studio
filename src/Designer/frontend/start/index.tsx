import { createRoot } from 'react-dom/client';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from '@altinn-studio/language/src/nb.json';
import en from '@altinn-studio/language/src/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnvironmentConfigProvider } from 'app-shared/contexts/EnvironmentConfigContext';
import 'app-shared/design-tokens';
import { StartPage } from './components/StartPage';

i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  resources: {
    nb: { translation: nb },
    en: { translation: en },
  },
  fallbackLng: 'nb',
});

// Using a minimal QueryClientProvider instead of ServicesContextProvider because the start page
// is for unauthenticated users. ServicesContextProvider includes global 401 error handlers
// that trigger logout on unauthorized responses, which is not appropriate here.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <QueryClientProvider client={queryClient}>
    <EnvironmentConfigProvider>
      <StartPage />
    </EnvironmentConfigProvider>
  </QueryClientProvider>,
);
