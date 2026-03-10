import React from 'react';
import { createRoot } from 'react-dom/client';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { PostHogContextProvider } from 'app-shared/contexts/PostHogContext';
import { ConsentProvider } from 'app-shared/utils/consent';
import { ConsentBanner } from 'app-shared/components';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { AppShell } from 'app-shared/AppShell';
import { routes } from './router/PageRoutes';
import { LayoutContextProvider } from './contexts/LayoutContext';
import { PreviewContextProvider } from './contexts/PreviewContext';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

function ConsentWrapper({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <PostHogContextProvider>
      <ConsentProvider>
        <ConsentBanner />
        <PreviewConnectionContextProvider>
          <PreviewContextProvider>
            <LayoutContextProvider>{children}</LayoutContextProvider>
          </PreviewContextProvider>
        </PreviewConnectionContextProvider>
      </ConsentProvider>
    </PostHogContextProvider>
  );
}

root.render(
  <AppShell basename={APP_DEVELOPMENT_BASENAME} routes={routes} providers={[ConsentWrapper]} />,
);
