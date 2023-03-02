import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IRepository } from 'app-shared/types/global';
import React, { useMemo } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppContextProvider } from './contexts/appContext';
import { ServicesContextProvider } from './contexts/servicesContext';
import { OrganizationService } from './services/organizationService';
import { AddRepo, RepoService, SearchRepository } from './services/repoService';
import { UserService } from './services/userService';

export type Services = {
  userService?: Partial<UserService>;
  organizationService?: Partial<OrganizationService>;
  repoService?: Partial<RepoService>;
};

export type MockServicesContextWrapperProps = {
  children: React.ReactNode;
  customServices?: Services;
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

  const userService: UserService = {
    getCurrentUser: () =>
      Promise.resolve({ avatar_url: null, email: '', full_name: '', id: null, login: null }),
    logout: () => Promise.resolve(),
    ...customServices?.userService,
  };

  const organizationService: OrganizationService = {
    getOrganizations: () => Promise.resolve([]),
    ...customServices?.organizationService,
  };

  const repoService: RepoService = {
    addRepo: (repoToAdd: AddRepo) => Promise.resolve({} as IRepository),
    copyApp: () => Promise.resolve(),
    getStarredRepos: () => Promise.resolve([] as IRepository[]),
    searchRepos: () => Promise.resolve({} as unknown as SearchRepository),
    setStarredRepo: () => Promise.resolve([]),
    unsetStarredRepo: () => Promise.resolve(),
    ...customServices?.repoService,
  };

  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AppContextProvider>
          <ServicesContextProvider
            userService={userService}
            organizationService={organizationService}
            repoService={repoService}
          >
            {children}
          </ServicesContextProvider>
        </AppContextProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};
