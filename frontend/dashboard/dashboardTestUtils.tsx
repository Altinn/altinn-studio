import { QueryClient } from '@tanstack/react-query';
import { IRepository } from 'app-shared/types/global';
import React, { useMemo, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  ServicesContextProps,
  ServicesContextProvider,
  ServicesContextProviderProps
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AddRepoParams, SearchRepoFilterParams, SearchRepositoryResponse } from 'app-shared/types/api';

export type MockServicesContextWrapperProps = {
  children: ReactNode;
  customServices?: Partial<ServicesContextProps>;
};

export const MockServicesContextWrapper = ({
  children,
  customServices,
}: MockServicesContextWrapperProps) => {
  const client = useMemo(
    () =>
      new QueryClient({
        logger: {
          log: () => {},
          warn: () => {},
          error: () => {},
        },
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false, staleTime: Infinity },
        },
      }),
    []
  );

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
  };

  return (
    <MemoryRouter>
      <ServicesContextProvider {...queries}>
        {children}
      </ServicesContextProvider>
    </MemoryRouter>
  );
};
