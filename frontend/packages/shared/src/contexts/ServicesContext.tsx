import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';
import type * as queries from '../api/queries';
import type * as mutations from '../api/mutations';

export type ServicesContextProps = typeof queries & typeof mutations;
export type ServicesContextProviderProps = ServicesContextProps & {
  children?: ReactNode;
};

const ServicesContext = createContext<ServicesContextProps>(undefined);

export const ServicesContextProvider = ({ children, ...queries }: ServicesContextProviderProps) => {
  return <ServicesContext.Provider value={{ ...queries }}>{children}</ServicesContext.Provider>;
};

export const useServicesContext = function (): ServicesContextProps {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServicesContext must be used within a ServicesContextProvider.');
  }
  return context;
};
