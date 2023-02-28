import React from 'react';
import { UserService } from '../services/userService';
import { OrganizationService } from '../services/organizationService';
import { createStrictContext } from '../utils/createStrictContext';

type ServicesContext = {
  userService: UserService;
  organizationService: OrganizationService;
};

const [ServicesProvider, useServicesContext] = createStrictContext<ServicesContext>();

type ServicesContextProviderProps = {
  children: React.ReactNode;
} & ServicesContext;
export const ServicesContextProvider = ({
  children,
  userService,
  organizationService,
}: ServicesContextProviderProps) => (
  <ServicesProvider value={{ userService, organizationService }}>{children}</ServicesProvider>
);

export { useServicesContext };
