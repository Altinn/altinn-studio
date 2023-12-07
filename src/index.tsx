// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createHashRouter, RouterProvider } from 'react-router-dom';

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
import { DevTools } from 'src/features/devtools/DevTools';
import { FooterLayoutProvider } from 'src/features/footer/FooterLayoutProvider';
import { PageNavigationProvider } from 'src/features/form/layout/PageNavigationContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { InstantiationProvider } from 'src/features/instantiate/InstantiationContext';
import { LanguageProvider } from 'src/features/language/LanguageProvider';
import { TextResourcesProvider } from 'src/features/language/textResources/TextResourcesProvider';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { ProfileProvider } from 'src/features/profile/ProfileProvider';
import * as queries from 'src/queries/queries';
import { initSagas } from 'src/redux/sagas';
import { setupStore } from 'src/redux/store';
import { ExprContextWrapper } from 'src/utils/layout/ExprContext';

import 'src/index.css';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';

const router = createHashRouter([
  {
    path: '*',
    element: <Root />,
  },
]);

document.addEventListener('DOMContentLoaded', () => {
  const { store, sagaMiddleware } = setupStore();
  initSagas(sagaMiddleware);

  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <AppQueriesProvider {...queries}>
      <Provider store={store}>
        <ErrorBoundary>
          <AppWrapper>
            <LanguageProvider>
              <ThemeWrapper>
                <RouterProvider router={router} />
              </ThemeWrapper>
            </LanguageProvider>
          </AppWrapper>
        </ErrorBoundary>
      </Provider>
    </AppQueriesProvider>,
  );
});

function Root() {
  return (
    <InstantiationProvider>
      <PageNavigationProvider>
        <ExprContextWrapper>
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
                              <DevTools>
                                <App />
                              </DevTools>
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
        </ExprContextWrapper>
      </PageNavigationProvider>
    </InstantiationProvider>
  );
}
