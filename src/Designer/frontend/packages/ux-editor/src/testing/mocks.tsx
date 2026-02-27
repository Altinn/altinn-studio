import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render, renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { ILayoutSettings } from 'app-shared/types/global';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { layout1NameMock, layout2NameMock } from './layoutMock';
import type { QueryClient } from '@tanstack/react-query';
import type { AppContextProps } from '../AppContext';
import { AppContext } from '../AppContext';
import { appContextMock } from './appContextMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { PreviewContext, type PreviewContextProps } from 'app-development/contexts/PreviewContext';
import type { AppRouteParams } from 'app-shared/types/AppRouteParams';
import {
  FeatureFlagMutationContextProvider,
} from '@studio/feature-flags';
import type { FeatureFlag, FeatureFlagMutationContextValue } from '@studio/feature-flags';
import type { UxEditorParams } from '../hooks/useUxEditorParams';
import {
  app as testApp,
  layoutSet as testLayoutSet,
  org as testOrg,
} from '@studio/testing/testids';
import { composeWrappers, type WrapperFunction } from '@studio/testing/composeWrappers';
import {
  withServicesProvider,
  withPreviewConnection,
  withFeatureFlags,
} from '@studio/testing/providerWrappers';

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

function withAppRouter(
  appRouteParams: AppRouteParams,
  uxEditorParams: UxEditorParams,
): WrapperFunction {
  const { org, app } = appRouteParams;
  const { layoutSet } = uxEditorParams;
  const route = `/${org}/${app}/${layoutSet}`;
  const path = '/:org/:app/:layoutSet';
  return (children: ReactNode) => (
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    </MemoryRouter>
  );
}

function withAppContext(appContextProps: Partial<AppContextProps> = {}): WrapperFunction {
  return (children: ReactNode) => (
    <AppContext.Provider value={{ ...appContextMock, ...appContextProps }}>
      {children}
    </AppContext.Provider>
  );
}

function withPreviewContext(
  previewContextProps: Partial<PreviewContextProps> = {},
): WrapperFunction {
  return (children: ReactNode) => (
    <PreviewContext.Provider value={{ ...defaultPreviewContextProps, ...previewContextProps }}>
      {children}
    </PreviewContext.Provider>
  );
}

function withFeatureFlagMutations(
  featureFlagMutations: FeatureFlagMutationContextValue = defaultFeatureFlagMutations,
): WrapperFunction {
  return (children: ReactNode) => (
    <FeatureFlagMutationContextProvider value={featureFlagMutations}>
      {children}
    </FeatureFlagMutationContextProvider>
  );
}

type AppRouterProps = {
  params: AppRouteParams & UxEditorParams;
  children: ReactNode;
};

export function AppRouter({
  params: { org, app, layoutSet },
  children,
}: AppRouterProps): ReactElement {
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

function createWrappers({
  queries = {},
  queryClient = queryClientMock,
  appContextProps = {},
  previewContextProps = {},
  appRouteParams = defaultAppRouteParams,
  featureFlags = [],
  featureFlagMutations = defaultFeatureFlagMutations,
  uxEditorParams = defaultUxEditorParams,
}: Partial<ExtendedRenderOptions> = {}) {
  return composeWrappers([
    withAppRouter(appRouteParams, uxEditorParams),
    withServicesProvider({ queries, queryClient }),
    withPreviewConnection(),
    withAppContext(appContextProps),
    withPreviewContext(previewContextProps),
    withFeatureFlagMutations(featureFlagMutations),
    withFeatureFlags({ featureFlags }),
  ]);
}

export const renderHookWithProviders = (
  hook: () => any,
  options: ExtendedRenderOptions = {},
) => {
  const Wrapper = createWrappers(options);
  return renderHook(hook, { wrapper: Wrapper });
};

export const renderWithProviders = (
  component: ReactNode,
  {
    queries,
    queryClient,
    appContextProps,
    previewContextProps,
    appRouteParams,
    featureFlags,
    featureFlagMutations,
    uxEditorParams,
    ...renderOptions
  }: Partial<ExtendedRenderOptions> = {},
) => {
  const Wrapper = createWrappers({
    queries,
    queryClient,
    appContextProps,
    previewContextProps,
    uxEditorParams,
    appRouteParams,
    featureFlags,
    featureFlagMutations,
  });

  return {
    ...render(component, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
};
