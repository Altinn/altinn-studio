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

export const formLayoutSettingsMock: ILayoutSettings = {
  pages: {
    order: [layout1NameMock, layout2NameMock],
  },
};

export const textLanguagesMock = ['nb', 'nn', 'en'];

export const optionListIdsMock: string[] = ['test-1', 'test-2'];

const defaultAppRouteParams: AppRouteParams = {
  org: 'defaultTestOrg',
  app: 'defaultTestApp',
};

const defaultPreviewContextProps: PreviewContextProps = {
  shouldReloadPreview: false,
  doReloadPreview: jest.fn(),
  previewHasLoaded: jest.fn(),
};

type WrapperArgs = {
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
  appContextProps: Partial<AppContextProps>;
  previewContextProps?: Partial<PreviewContextProps>;
  appRouteParams?: AppRouteParams;
};

function wrapper({
  queries = {},
  queryClient = queryClientMock,
  appContextProps = {},
  previewContextProps = {},
  appRouteParams = defaultAppRouteParams,
}: WrapperArgs): (component: ReactNode) => ReactElement {
  const renderComponent = (component: ReactNode): ReactElement => (
    <AppRouter params={appRouteParams}>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        <PreviewConnectionContextProvider>
          <AppContext.Provider value={{ ...appContextMock, ...appContextProps }}>
            <PreviewContext.Provider
              value={{ ...defaultPreviewContextProps, ...previewContextProps }}
            >
              {component}
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
  params: AppRouteParams;
  children: ReactNode;
};

function AppRouter({ params: { org, app }, children }: AppRouterProps): ReactElement {
  const route = `/${org}/${app}`;
  const path = '/:org/:app';
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
}

export const renderHookWithProviders = (
  hook: () => any,
  {
    queries = {},
    queryClient = queryClientMock,
    appContextProps = {},
    previewContextProps = {},
    appRouteParams = defaultAppRouteParams,
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
          appRouteParams,
        })(children),
      ...renderOptions,
    }),
  };
};
