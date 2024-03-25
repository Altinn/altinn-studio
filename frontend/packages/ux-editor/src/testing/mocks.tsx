import type { ReactNode } from 'react';
import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render, renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ILayoutSettings } from 'app-shared/types/global';
import { MemoryRouter } from 'react-router-dom';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { layout1NameMock, layout2NameMock } from './layoutMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import type { AppContextProps } from '../AppContext';
import { AppContext } from '../AppContext';
import { appContextMock } from './appContextMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';

export const formLayoutSettingsMock: ILayoutSettings = {
  pages: {
    order: [layout1NameMock, layout2NameMock],
  },
  receiptLayoutName: 'Kvittering',
};

export const textLanguagesMock = ['nb', 'nn', 'en'];

export const optionListIdsMock: string[] = ['test-1', 'test-2'];

type WrapperArgs = {
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
  appContextProps: Partial<AppContextProps>;
};

const wrapper = ({
  queries = {},
  queryClient = queryClientMock,
  appContextProps = {},
}: WrapperArgs) => {
  const renderComponent = (component: ReactNode) => (
    <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
      <PreviewConnectionContextProvider>
        <AppContext.Provider value={{ ...appContextMock, ...appContextProps }}>
          <MemoryRouter>{component}</MemoryRouter>
        </AppContext.Provider>
      </PreviewConnectionContextProvider>
    </ServicesContextProvider>
  );
  return renderComponent;
};

export interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
  appContextProps?: Partial<AppContextProps>;
}

export const renderHookWithProviders = (
  hook: () => any,
  { queries = {}, queryClient = queryClientMock, appContextProps = {} }: ExtendedRenderOptions = {},
) => {
  return renderHook(hook, {
    wrapper: ({ children }) =>
      wrapper({
        queries,
        queryClient,
        appContextProps,
      })(children),
  });
};

export const renderWithProviders = (
  component: ReactNode,
  {
    queries = {},
    queryClient = queryClientMock,
    appContextProps = {},
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
        })(children),
      ...renderOptions,
    }),
  };
};
