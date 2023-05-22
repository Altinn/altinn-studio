import React, { createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as queries from '../queries/queries';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export type ServicesContextProps = typeof queries;

const ServicesContext = createContext<ServicesContextProps>(null);
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});
export const ServicesContextProvider = ({
  children,
  ...queries
}: ServicesContextProps & { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ServicesContext.Provider value={{ ...queries }}>{children}</ServicesContext.Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export const useServicesContext = function (): ServicesContextProps {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServicesContext must be used within a ServicesContextProvider.');
  }
  return context;
};
