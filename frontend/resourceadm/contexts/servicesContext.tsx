import React from 'react';
import { UserService } from '../services/userService';
import { OrganizationService } from '../services/organizationService';
import { RepoService } from '../services/repoService';
import { createStrictContext } from '../utils/createStrictContext';


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
