// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Slide, ToastContainer } from 'react-toastify';

import 'src/features/toggles';
import 'src/features/logging';
import 'src/features/styleInjection';

import { AppWrapper } from '@altinn/altinn-design-system';

import { App } from 'src/App';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ThemeWrapper } from 'src/components/ThemeWrapper';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { WindowTitleProvider } from 'src/core/ui/WindowTitleProvider';
import { ApplicationMetadataProvider } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { ApplicationSettingsProvider } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { FooterLayoutProvider } from 'src/features/footer/FooterLayoutProvider';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { InstantiationProvider } from 'src/features/instantiate/InstantiationContext';
import { LanguageProvider } from 'src/features/language/LanguageProvider';
import { TextResourcesProvider } from 'src/features/language/textResources/TextResourcesProvider';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { ProfileProvider } from 'src/features/profile/ProfileProvider';
import * as queries from 'src/queries/queries';

import 'react-toastify/dist/ReactToastify.css';
import 'src/index.css';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';

const router = createHashRouter([
  {
    path: '*',
    element: <Root />,
  },
]);

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <AppQueriesProvider {...queries}>
      <ErrorBoundary>
        <AppWrapper>
          <LanguageProvider>
            <ThemeWrapper>
              <UiConfigProvider>
                <RouterProvider router={router} />
              </UiConfigProvider>
            </ThemeWrapper>
          </LanguageProvider>
        </AppWrapper>
      </ErrorBoundary>
    </AppQueriesProvider>,
  );
});

function Root() {
  return (
    <InstantiationProvider>
      <ApplicationMetadataProvider>
        <OrgsProvider>
          <ApplicationSettingsProvider>
            <LayoutSetsProvider>
              <FooterLayoutProvider>
                <ProfileProvider>
                  <PartyProvider>
                    <TextResourcesProvider>
                      <KeepAliveProvider>
                        <WindowTitleProvider>
                          <App />
                          <ToastContainer
                            position='top-center'
                            theme='colored'
                            transition={Slide}
                            draggable={false}
                          />
                        </WindowTitleProvider>
                      </KeepAliveProvider>
                    </TextResourcesProvider>
                  </PartyProvider>
                </ProfileProvider>
              </FooterLayoutProvider>
            </LayoutSetsProvider>
          </ApplicationSettingsProvider>
        </OrgsProvider>
      </ApplicationMetadataProvider>
    </InstantiationProvider>
  );
}
