import React from 'react';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MemoryRouterProps } from 'react-router-dom';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';

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
        <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
          {children}
        </ServicesContextProvider>
      </MemoryRouter>
    ),
  };
  return render(component, renderOptions);
}
