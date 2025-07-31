import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render, renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ILayoutSettings } from 'app-shared/types/global';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { layout1NameMock, layout2NameMock } from './layoutMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import type { AppContextProps } from '../AppContext';
import { AppContext } from '../AppContext';
import { appContextMock } from './appContextMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { PreviewContext, type PreviewContextProps } from 'app-development/contexts/PreviewContext';
import type { AppRouteParams } from 'app-shared/types/AppRouteParams';
import {
  FeatureFlagsContextProvider,
  FeatureFlagMutationContextProvider,
} from '@studio/feature-flags';
import type { FeatureFlag, FeatureFlagMutationContextValue } from '@studio/feature-flags';
import type { UxEditorParams } from '../hooks/useUxEditorParams';
import {
  app as testApp,
  layoutSet as testLayoutSet,
  org as testOrg,
} from '@studio/testing/testids';

export const formLayoutSettingsMock: ILayoutSettings = {
  pages: {
    order: [layout1NameMock, layout2NameMock],
  },
};

export const textLanguagesMock = ['nb', 'nn', 'en'];

export const optionListIdsMock: string[] = ['test-1', 'test-2'];

const defaultAppRouteParams: AppRouteParams = {
  org: testOrg,
  app: testApp,
};

const defaultUxEditorParams: UxEditorParams = {
  layoutSet: testLayoutSet,
};

const defaultPreviewContextProps: PreviewContextProps = {
  shouldReloadPreview: false,
  doReloadPreview: jest.fn(),
  previewHasLoaded: jest.fn(),
};

const defaultFeatureFlagMutations: FeatureFlagMutationContextValue = {
  addFlag: jest.fn(),
  removeFlag: jest.fn(),
};

type WrapperArgs = {
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
  appContextProps: Partial<AppContextProps>;
  previewContextProps?: Partial<PreviewContextProps>;
  uxEditorParams?: UxEditorParams;
  appRouteParams?: AppRouteParams;
  featureFlags?: FeatureFlag[];
  featureFlagMutations?: FeatureFlagMutationContextValue;
};

function wrapper({
  queries = {},
  queryClient = queryClientMock,
  appContextProps = {},
  previewContextProps = {},
  uxEditorParams = defaultUxEditorParams,
  appRouteParams = defaultAppRouteParams,
  featureFlags = [],
  featureFlagMutations = defaultFeatureFlagMutations,
}: WrapperArgs): (component: ReactNode) => ReactElement {
  const renderComponent = (component: ReactNode): ReactElement => (
    <AppRouter params={{ ...appRouteParams, ...uxEditorParams }}>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        <PreviewConnectionContextProvider>
          <AppContext.Provider value={{ ...appContextMock, ...appContextProps }}>
            <PreviewContext.Provider
              value={{ ...defaultPreviewContextProps, ...previewContextProps }}
            >
              <FeatureFlagMutationContextProvider value={featureFlagMutations}>
                <FeatureFlagsContextProvider value={{ flags: featureFlags }}>
                  {component}
                </FeatureFlagsContextProvider>
              </FeatureFlagMutationContextProvider>
            </PreviewContext.Provider>
          </AppContext.Provider>
        </PreviewConnectionContextProvider>
      </ServicesContextProvider>
    </AppRouter>
  );
  renderComponent.displayName = 'renderComponent';
  return renderComponent;
}

type AppRouterProps = {
  params: AppRouteParams & UxEditorParams;
  children: ReactNode;
};

function AppRouter({ params: { org, app, layoutSet }, children }: AppRouterProps): ReactElement {
  const route = `/${org}/${app}/${layoutSet}`;
  const path = '/:org/:app/:layoutSet';
  return (
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    </MemoryRouter>
  );
}

export interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
  appContextProps?: Partial<AppContextProps>;
  previewContextProps?: Partial<PreviewContextProps>;
  appRouteParams?: AppRouteParams;
  featureFlags?: FeatureFlag[];
  featureFlagMutations?: FeatureFlagMutationContextValue;
  uxEditorParams?: UxEditorParams;
}

export const renderHookWithProviders = (
  hook: () => any,
  {
    queries = {},
    queryClient = queryClientMock,
    appContextProps = {},
    previewContextProps = {},
    appRouteParams = defaultAppRouteParams,
    featureFlags = [],
    featureFlagMutations = defaultFeatureFlagMutations,
    uxEditorParams = defaultUxEditorParams,
  }: ExtendedRenderOptions = {},
) => {
  return renderHook(hook, {
    wrapper: ({ children }) =>
      wrapper({
        queries,
        queryClient,
        appContextProps,
        previewContextProps,
        appRouteParams,
        featureFlags,
        featureFlagMutations,
        uxEditorParams,
      })(children),
  });
};

export const renderWithProviders = (
  component: ReactNode,
  {
    queries = {},
    queryClient = queryClientMock,
    appContextProps = {},
    previewContextProps = {},
    appRouteParams = defaultAppRouteParams,
    featureFlags = [],
    featureFlagMutations = defaultFeatureFlagMutations,
    uxEditorParams = defaultUxEditorParams,
    ...renderOptions
  }: Partial<ExtendedRenderOptions> = {},
) => {
  return {
    ...render(component, {
      wrapper: ({ children }) =>
        wrapper({
          queries,
          queryClient,
          appContextProps,
          previewContextProps,
          uxEditorParams,
          appRouteParams,
          featureFlags,
          featureFlagMutations,
        })(children),
      ...renderOptions,
    }),
  };
};
