import type { ReactNode } from 'react';
import React from 'react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient, QueryClientConfig } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { WrapperFunction } from './composeWrappers';
import { TestAppRouter } from './testRoutingUtils';

export interface ServicesProviderWrapperOptions {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
  queryClientConfig?: QueryClientConfig;
}

export function withServicesProvider({
  queries = {},
  queryClient,
  queryClientConfig = queryClientConfigMock,
}: ServicesProviderWrapperOptions = {}): WrapperFunction {
  return (children: ReactNode) => (
    <ServicesContextProvider
      {...queriesMock}
      {...queries}
      client={queryClient}
      clientConfig={queryClientConfig}
    >
      {children}
    </ServicesContextProvider>
  );
}

export function withPreviewConnection(): WrapperFunction {
  return (children: ReactNode) => (
    <PreviewConnectionContextProvider>{children}</PreviewConnectionContextProvider>
  );
}

export interface TestAppRouterWrapperOptions {
  initialPath?: string;
  pathTemplate?: string;
}

export function withTestAppRouter({
  initialPath,
  pathTemplate,
}: TestAppRouterWrapperOptions = {}): WrapperFunction {
  return (children: ReactNode) => (
    <TestAppRouter initialPath={initialPath} pathTemplate={pathTemplate}>
      {children}
    </TestAppRouter>
  );
}

export interface MemoryRouterWrapperOptions {
  initialEntries?: string[];
}

export function withMemoryRouter({
  initialEntries,
}: MemoryRouterWrapperOptions = {}): WrapperFunction {
  return (children: ReactNode) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}
