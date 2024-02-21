import React, { type ReactNode } from 'react';
import configureStore from 'redux-mock-store';
import type { IAppState } from '../types/global';
import { Provider } from 'react-redux';
import type { PreloadedState } from '@reduxjs/toolkit';
import { render, renderHook, type RenderOptions } from '@testing-library/react';
import {
  ServicesContextProvider,
  type ServicesContextProps,
} from 'app-shared/contexts/ServicesContext';
import type { ILayoutSettings } from 'app-shared/types/global';
import { BrowserRouter } from 'react-router-dom';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { layout1NameMock, layout2NameMock } from './layoutMock';
import { appStateMock } from './stateMocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { AppContext, type AppContextProps } from '../AppContext';
import { appContextMock } from './appContextMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { setupStore, type AppStore, type RootState } from '../store';

export const formLayoutSettingsMock: ILayoutSettings = {
  pages: {
    order: [layout1NameMock, layout2NameMock],
  },
  receiptLayoutName: 'Kvittering',
};

export const textLanguagesMock = ['nb', 'nn', 'en'];

export const optionListIdsMock: string[] = ['test-1', 'test-2'];

type WrapperArgs = {
  appContextProps: Partial<AppContextProps>;
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
  state: Partial<IAppState>;
  storeCreator: ReturnType<typeof configureStore>;
};

const wrapper = ({
  appContextProps = {},
  queries = {},
  queryClient = queryClientMock,
  state = {},
  storeCreator,
}: WrapperArgs) => {
  const store = storeCreator({ ...appStateMock, ...state });
  const renderComponent = (component: ReactNode) => (
    <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
      <PreviewConnectionContextProvider>
        <Provider store={store}>
          <AppContext.Provider value={{ ...appContextMock, ...appContextProps }}>
            <BrowserRouter>{component}</BrowserRouter>
          </AppContext.Provider>
        </Provider>
      </PreviewConnectionContextProvider>
    </ServicesContextProvider>
  );
  return { store, renderComponent };
};

/**
 *
 * @deprecated Use renderWithProviders instead
 */
export const renderWithMockStore =
  (
    state: Partial<IAppState> = {},
    queries: Partial<ServicesContextProps> = {},
    queryClient: QueryClient = queryClientMock,
    appContextProps: Partial<AppContextProps> = {},
  ) =>
  (component: ReactNode) => {
    const storeCreator = configureStore();
    const { renderComponent, store } = wrapper({
      appContextProps,
      queries,
      queryClient,
      state,
      storeCreator,
    });
    const renderResult = render(renderComponent(component));
    const rerender = (rerenderedComponent) =>
      renderResult.rerender(renderComponent(rerenderedComponent));
    return { renderResult: { ...renderResult, rerender }, store };
  };

export const renderHookWithMockStore =
  (
    state: Partial<IAppState> = {},
    queries: Partial<ServicesContextProps> = {},
    queryClient: QueryClient = queryClientMock,
    appContextProps: Partial<AppContextProps> = {},
  ) =>
  (hook: () => any) => {
    const storeCreator = configureStore();
    const { renderComponent, store } = wrapper({
      appContextProps,
      queries,
      queryClient,
      state,
      storeCreator,
    });
    const renderHookResult = renderHook(hook, {
      wrapper: ({ children }) => renderComponent(children),
    });
    return { renderHookResult, store };
  };

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  store?: AppStore;
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
  appContextProps?: Partial<AppContextProps>;
}

export const renderWithProviders = (
  component: ReactNode,
  {
    preloadedState = {},
    queries = {},
    queryClient = queryClientMock,
    store = setupStore(preloadedState),
    appContextProps = {},
    ...renderOptions
  }: Partial<ExtendedRenderOptions> = {},
) => {
  function Wrapper({ children }: React.PropsWithChildren<unknown>) {
    return (
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        <PreviewConnectionContextProvider>
          <Provider store={store}>
            <AppContext.Provider value={{ ...appContextMock, ...appContextProps }}>
              <BrowserRouter>{children}</BrowserRouter>
            </AppContext.Provider>
          </Provider>
        </PreviewConnectionContextProvider>
      </ServicesContextProvider>
    );
  }

  return {
    store,
    ...render(component, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
};
