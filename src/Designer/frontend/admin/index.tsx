import React from 'react';
import { createRoot } from 'react-dom/client';
import { ADMIN_BASENAME } from 'app-shared/constants';
import { AppShell } from 'app-shared/AppShell';
import { PostHogContextProvider } from 'app-shared/contexts/PostHogContext';
import { ConsentProvider } from 'app-shared/utils/consent';
import { ConsentBanner } from 'app-shared/components';
import { routes } from './routes/routes';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

function ConsentWrapper({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <PostHogContextProvider>
      <ConsentProvider>
        <ConsentBanner />
        {children}
      </ConsentProvider>
    </PostHogContextProvider>
  );
}

root.render(<AppShell basename={ADMIN_BASENAME} routes={routes} providers={[ConsentWrapper]} />);
