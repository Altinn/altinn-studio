import type { ReactNode } from 'react';
import React from 'react';
import configureStore from 'redux-mock-store';
import type { RootState } from '../store';
import { Provider } from 'react-redux';
import { render, renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { BrowserRouter } from 'react-router-dom';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';

import { queriesMock } from 'app-shared/mocks/queriesMock';
import { rootStateMock } from './rootStateMock';
import type { QueryClient } from '@tanstack/react-query';
import { queryClientConfigMock } from 'app-shared/mocks/queryClientMock';

export const textLanguagesMock = ['nb', 'nn', 'en'];

export const renderWithMockStore =
  (
    state: Partial<RootState> = {},
    queries: Partial<ServicesContextProps> = {},
    queryClient?: QueryClient,
  ) =>
  (component: ReactNode) => {
    const store = configureStore()({ ...rootStateMock, ...state });
    const renderResult = render(
      <ServicesContextProvider
        {...queriesMock}
        {...queries}
        client={queryClient}
        clientConfig={queryClientConfigMock}
      >
        <PreviewConnectionContextProvider>
          <Provider store={store}>
            <BrowserRouter>{component}</BrowserRouter>
          </Provider>
        </PreviewConnectionContextProvider>
      </ServicesContextProvider>,
    );
    const rerender = (rerenderedComponent) =>
      renderResult.rerender(
        <ServicesContextProvider
          {...queriesMock}
          {...queries}
          client={queryClient}
          clientConfig={queryClientConfigMock}
        >
          <PreviewConnectionContextProvider>
            <Provider store={store}>
              <BrowserRouter>{rerenderedComponent}</BrowserRouter>
            </Provider>
          </PreviewConnectionContextProvider>
        </ServicesContextProvider>,
      );
    return { renderResult: { ...renderResult, rerender }, store };
  };

export const renderHookWithMockStore =
  (
    state: Partial<RootState> = {},
    queries: Partial<ServicesContextProps> = {},
    queryClient?: QueryClient,
  ) =>
  (hook: () => any) => {
    const store = configureStore()({ ...rootStateMock, ...state });
    const renderHookResult = renderHook(hook, {
      wrapper: ({ children }) => (
        <ServicesContextProvider
          {...queriesMock}
          {...queries}
          client={queryClient}
          clientConfig={queryClientConfigMock}
        >
          <PreviewConnectionContextProvider>
            <Provider store={store}>{children}</Provider>
          </PreviewConnectionContextProvider>
        </ServicesContextProvider>
      ),
    });
    return { renderHookResult, store };
  };
