import React, { createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as queries from '../queries/queries';

type ServicesContextProps = typeof queries;

const ServicesContext = createContext<ServicesContextProps>(null);

export const ServicesContextProvider = ({
  children,
  ...queries
}: ServicesContextProps & { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ServicesContext.Provider value={{ ...queries }}>{children}</ServicesContext.Provider>
    </QueryClientProvider>
  );
};

export const useServicesContext = function (): Partial<ServicesContextProps> {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useCountDispatch must be used within a CountProvider');
  }
  return context;
};
