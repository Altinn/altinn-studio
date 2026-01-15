import type { ReactNode } from 'react';
import React from 'react';
import { render, renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';

import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import { PreviewContext, type PreviewContextProps } from '../contexts/PreviewContext';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';

export const renderWithProviders =
  (
    queries: Partial<ServicesContextProps> = {},
    queryClient?: QueryClient,
    previewContextProps: Partial<PreviewContextProps> = {},
    path?: string,
    pathTemplate?: string,
  ) =>
  (component: ReactNode) => {
    const renderResult = render(
      <TestAppRouter initialPath={path} pathTemplate={pathTemplate}>
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
              {component}
            </PreviewContext.Provider>
          </PreviewConnectionContextProvider>
        </ServicesContextProvider>
      </TestAppRouter>,
    );
    const rerender = (rerenderedComponent: ReactNode) =>
      renderResult.rerender(
        <TestAppRouter initialPath={path} pathTemplate={pathTemplate}>
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
                {rerenderedComponent}
              </PreviewContext.Provider>
            </PreviewConnectionContextProvider>
          </ServicesContextProvider>
        </TestAppRouter>,
      );
    return { renderResult: { ...renderResult, rerender } };
  };

export const renderHookWithProviders =
  (queries: Partial<ServicesContextProps> = {}, queryClient?: QueryClient) =>
  (hook: () => any) => {
    const renderHookResult = renderHook(hook, {
      wrapper: ({ children }) => (
        <TestAppRouter>
          <ServicesContextProvider
            {...queriesMock}
            {...queries}
            client={queryClient}
            clientConfig={queryClientConfigMock}
          >
            <PreviewConnectionContextProvider>{children}</PreviewConnectionContextProvider>
          </ServicesContextProvider>
        </TestAppRouter>
      ),
    });
    return { renderHookResult };
  };

const defaultPreviewContextProps: PreviewContextProps = {
  shouldReloadPreview: false,
  doReloadPreview: jest.fn(),
  previewHasLoaded: jest.fn(),
};
