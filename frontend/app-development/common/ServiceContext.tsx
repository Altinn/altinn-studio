import React, { createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as queries from '../queries/queries';
import type * as mutations from '../queries/mutations';

export type ServicesContextProps = typeof queries & typeof mutations;

const ServicesContext = createContext<ServicesContextProps>(null);
const queryClient = new QueryClient({
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
