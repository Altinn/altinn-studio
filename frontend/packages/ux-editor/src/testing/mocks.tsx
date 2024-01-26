import type { ReactNode } from 'react';
import React from 'react';
import configureStore from 'redux-mock-store';
import type { IAppState } from '../types/global';
import { Provider } from 'react-redux';
import { render, renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ILayoutSettings } from 'app-shared/types/global';
import { BrowserRouter } from 'react-router-dom';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { layout1NameMock, layout2NameMock } from './layoutMock';
import { appStateMock } from './stateMocks';
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
