import type { ReactNode } from 'react';
import React from 'react';
import { render, renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { BrowserRouter } from 'react-router-dom';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';

import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import { PreviewContext, type PreviewContextProps } from '../contexts/PreviewContext';

export const renderWithProviders =
  (
    queries: Partial<ServicesContextProps> = {},
    queryClient?: QueryClient,
    previewContextProps: Partial<PreviewContextProps> = {},
  ) =>
  (component: ReactNode) => {
    const renderResult = render(
      <ServicesContextProvider
        {...queriesMock}
        {...queries}
        client={queryClient}
        clientConfig={queryClientConfigMock}
      >
        <PreviewConnectionContextProvider>
          <PreviewContext.Provider
            value={{ ...defaultPreviewContextProps, ...previewContextProps }}
          >
            <BrowserRouter>{component}</BrowserRouter>
          </PreviewContext.Provider>
        </PreviewConnectionContextProvider>
      </ServicesContextProvider>,
    );
    const rerender = (rerenderedComponent: ReactNode) =>
      renderResult.rerender(
        <ServicesContextProvider
          {...queriesMock}
          {...queries}
          client={queryClient}
          clientConfig={queryClientConfigMock}
        >
          <PreviewConnectionContextProvider>
            <PreviewContext.Provider
              value={{ ...defaultPreviewContextProps, ...previewContextProps }}
            >
              <BrowserRouter>{rerenderedComponent}</BrowserRouter>
            </PreviewContext.Provider>
          </PreviewConnectionContextProvider>
        </ServicesContextProvider>,
      );
    return { renderResult: { ...renderResult, rerender } };
  };

export const renderHookWithProviders =
  (queries: Partial<ServicesContextProps> = {}, queryClient?: QueryClient) =>
  (hook: () => any) => {
    const renderHookResult = renderHook(hook, {
      wrapper: ({ children }) => (
        <ServicesContextProvider
          {...queriesMock}
          {...queries}
          client={queryClient}
          clientConfig={queryClientConfigMock}
        >
          <PreviewConnectionContextProvider>{children}</PreviewConnectionContextProvider>
        </ServicesContextProvider>
      ),
    });
    return { renderHookResult };
  };

const defaultPreviewContextProps: PreviewContextProps = {
  shouldReloadPreview: false,
  doReloadPreview: jest.fn(),
  previewHasLoaded: jest.fn(),
};
