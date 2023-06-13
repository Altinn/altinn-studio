import type { ReactNode } from 'react';
import React from 'react';
import configureStore from 'redux-mock-store';
import type { RootState } from '../store';
import { Provider } from 'react-redux';
import { render, renderHook } from '@testing-library/react';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { BrowserRouter } from 'react-router-dom';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';

import { queriesMock as allQueriesMock } from 'app-shared/mocks/queriesMock';
import { rootStateMock } from './rootStateMock';

export const textLanguagesMock = ['nb', 'nn', 'en'];

export const queriesMock: ServicesContextProps = {
  ...allQueriesMock,
};

export const renderWithMockStore =
  (state: Partial<RootState> = {}, queries: Partial<ServicesContextProps> = {}) =>
  (component: ReactNode) => {
    const store = configureStore()({ ...rootStateMock, ...state });
    const renderResult = render(
      <ServicesContextProvider {...queriesMock} {...queries}>
        <PreviewConnectionContextProvider>
          <Provider store={store}>
            <BrowserRouter>{component}</BrowserRouter>
          </Provider>
        </PreviewConnectionContextProvider>
      </ServicesContextProvider>
    );
    return { renderResult, store };
  };

export const renderHookWithMockStore =
  (state: Partial<RootState> = {}, queries: Partial<ServicesContextProps> = {}) =>
  (hook: () => any) => {
    const store = configureStore()({ ...rootStateMock, ...state });
    const renderHookResult = renderHook(hook, {
      wrapper: ({ children }) => (
        <ServicesContextProvider {...queriesMock} {...queries}>
          <PreviewConnectionContextProvider>
            <Provider store={store}>{children}</Provider>
          </PreviewConnectionContextProvider>
        </ServicesContextProvider>
      ),
    });
    return { renderHookResult, store };
  };
