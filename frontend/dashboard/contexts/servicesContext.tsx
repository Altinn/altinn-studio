import React from 'react';
import { UserService } from '../services/userService';
import { OrganizationService } from '../services/organizationService';
import { createStrictContext } from '../utils/createStrictContext';
import { RepoService } from 'dashboard/services/repoService';

type ServicesContext = {
  userService: UserService;
  organizationService: OrganizationService;
  repoService: RepoService;
};

const [ServicesProvider, useServicesContext] = createStrictContext<ServicesContext>();

type ServicesContextProviderProps = {
  children: React.ReactNode;
} & ServicesContext;
export const ServicesContextProvider = ({
  children,
  userService,
  organizationService,
  repoService,
}: ServicesContextProviderProps) => (
  <ServicesProvider value={{ userService, organizationService, repoService }}>
    {children}
  </ServicesProvider>
);

export { useServicesContext };
