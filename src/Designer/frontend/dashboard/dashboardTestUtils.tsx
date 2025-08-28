import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';
import type { MemoryRouterProps } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import type {
  ServicesContextProps,
  ServicesContextProviderProps,
} from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientConfigMock, createQueryClientMock } from 'app-shared/mocks/queryClientMock';

export type MockServicesContextWrapperProps = {
  children: ReactNode;
  customServices?: Partial<ServicesContextProps>;
  client?: QueryClient;
} & Pick<MemoryRouterProps, 'initialEntries'>;

export const MockServicesContextWrapper = ({
  children,
  customServices,
  client = createQueryClientMock(),
  initialEntries,
}: MockServicesContextWrapperProps) => {
  const queries: ServicesContextProviderProps = {
    ...queriesMock,
    ...customServices,
    client,
    clientConfig: queryClientConfigMock,
  };

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ServicesContextProvider {...queries}>{children}</ServicesContextProvider>
    </MemoryRouter>
  );
};
