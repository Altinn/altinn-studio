import type { ReactNode } from 'react';
import React from 'react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient, QueryClientConfig } from '@tanstack/react-query';
import type { MemoryRouterProps } from 'react-router-dom';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { FeatureFlagsContextProvider, type FeatureFlag } from '@studio/feature-flags';
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
  initialEntries?: MemoryRouterProps['initialEntries'];
}

export function withMemoryRouter({
  initialEntries,
}: MemoryRouterWrapperOptions = {}): WrapperFunction {
  return (children: ReactNode) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

export function withBrowserRouter(): WrapperFunction {
  return (children: ReactNode) => <BrowserRouter>{children}</BrowserRouter>;
}

export interface FeatureFlagsWrapperOptions {
  featureFlags?: FeatureFlag[];
}

export function withFeatureFlags({
  featureFlags = [],
}: FeatureFlagsWrapperOptions = {}): WrapperFunction {
  return (children: ReactNode) => (
    <FeatureFlagsContextProvider value={{ flags: featureFlags }}>
      {children}
    </FeatureFlagsContextProvider>
  );
}
