import { QueryClient } from '@tanstack/react-query';
import { IRepository } from 'app-shared/types/global';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  ServicesContextProps,
  ServicesContextProvider,
  ServicesContextProviderProps
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AddRepoParams, SearchRepoFilterParams, SearchRepositoryResponse } from 'app-shared/types/api';
import { queryClientConfigMock, createQueryClientMock } from 'app-shared/mocks/queryClientMock';

export type MockServicesContextWrapperProps = {
  children: ReactNode;
  customServices?: Partial<ServicesContextProps>;
  client?: QueryClient;
};

export const MockServicesContextWrapper = ({
  children,
  customServices,
  client = createQueryClientMock(),
}: MockServicesContextWrapperProps) => {
  const queries: ServicesContextProviderProps = {
    ...queriesMock,
    getUser: () => Promise.resolve({ avatar_url: null, email: '', full_name: '', id: null, login: null }),
    logout: () => Promise.resolve(),
    getOrganizations: () => Promise.resolve([]),
    addRepo: (repoToAdd: AddRepoParams) => Promise.resolve({} as IRepository),
    copyApp: () => Promise.resolve(),
    getStarredRepos: () => Promise.resolve([] as IRepository[]),
    searchRepos: (params: SearchRepoFilterParams) => Promise.resolve({} as SearchRepositoryResponse),
    setStarredRepo: () => Promise.resolve([]),
    unsetStarredRepo: () => Promise.resolve(),
    ...customServices,
    client,
    clientConfig: queryClientConfigMock
  };

  return (
    <MemoryRouter>
      <ServicesContextProvider {...queries}>
        {children}
      </ServicesContextProvider>
    </MemoryRouter>
  );
};
