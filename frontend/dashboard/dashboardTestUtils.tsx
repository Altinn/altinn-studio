import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { ServicesContextProvider } from './contexts/servicesContext';
import { OrganizationService } from './services/organizationService';
import { RepoService } from './services/repoService';
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

  return (
    <QueryClientProvider client={client}>
      <ServicesContextProvider userService={userService} organizationService={organizationService}>
        {children}
      </ServicesContextProvider>
      ;
    </QueryClientProvider>
  );
};
