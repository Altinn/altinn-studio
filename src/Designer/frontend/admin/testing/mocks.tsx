import type { ReactNode } from 'react';
import { render, renderHook } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MemoryRouterProps } from 'react-router-dom';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { FeatureFlagsProvider } from '@studio/feature-flags';

type ProviderData = {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
} & Pick<MemoryRouterProps, 'initialEntries'>;

export function renderWithProviders(
  component: ReactNode,
  { queries = {}, queryClient = createQueryClientMock(), initialEntries }: ProviderData = {},
) {
  const renderOptions: RenderOptions = {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>
        <FeatureFlagsProvider>
          <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
            {children}
          </ServicesContextProvider>
        </FeatureFlagsProvider>
      </MemoryRouter>
    ),
  };
  return render(component, renderOptions);
}

export function renderHookWithProviders<T, Props = undefined>(
  hook: (props: Props) => T,
  {
    queries = {},
    queryClient = createQueryClientMock(),
    initialEntries,
    initialProps,
  }: ProviderData & { initialProps?: Props } = {},
) {
  return renderHook(hook, {
    initialProps,
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>
        <FeatureFlagsProvider>
          <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
            {children}
          </ServicesContextProvider>
        </FeatureFlagsProvider>
      </MemoryRouter>
    ),
  });
}
