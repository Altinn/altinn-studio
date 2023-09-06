import React, { createContext, useContext, ReactNode, useState } from 'react';
import {
  MutationCache,
  MutationMeta,
  QueryCache,
  QueryClient,
  QueryClientConfig,
  QueryClientProvider,
  QueryMeta,
} from '@tanstack/react-query';
import type * as queries from '../api/queries';
import type * as mutations from '../api/mutations';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer, Slide, toast } from 'react-toastify';
import { ErrorBoundary } from 'react-error-boundary';
import { AxiosError } from 'axios';
import {  useTranslation } from 'react-i18next';
import { ErrorBoundaryFallback } from '../components/ErrorBoundaryFallback';

import 'react-toastify/dist/ReactToastify.css';
import 'app-shared/styles/toast.css';

export type ServicesContextProps = typeof queries & typeof mutations;
export type ServicesContextProviderProps = ServicesContextProps & {
  children?: ReactNode;
  client?: QueryClient; // TODO : #10913 should probably be removed to force the use of QueryCache and MutationCache
  clientConfig?: QueryClientConfig;
};

const ServicesContext = createContext<ServicesContextProps>(null);

const handleError = (
  error: AxiosError,
  t: (key: string) => string,
  meta: QueryMeta | MutationMeta
): void => {
  // TODO : log axios errors
  // TODO : handle messages from API
  // TODO : logout user when session is expired

  if (
    meta?.hideDefaultError === true ||
    (meta?.hideDefaultError instanceof Function && meta?.hideDefaultError?.(error))
  )
    return;

  toast.error(
    () => t('general.error_message'),
    { toastId: 'default' }
  );
};

export const ServicesContextProvider = ({
  children,
  client,
  clientConfig,
  ...queries
}: ServicesContextProviderProps) => {
  const { t } = useTranslation();

  const [queryClient] = useState(
    () =>
      client ||
      new QueryClient({
        ...clientConfig,
        queryCache: new QueryCache({
          onError: (error: AxiosError, query) => handleError(error, t, query.options?.meta),
        }),
        mutationCache: new MutationCache({
          onError: (error: AxiosError, variables, context, mutation) =>
            handleError(error, t, mutation.options?.meta),
        }),
      })
  );

  return (
    <ErrorBoundary
      FallbackComponent={ErrorBoundaryFallback}
      onError={() => {
        // TODO : log rendering errors
      }}
    >
      <ToastContainer position='top-center' autoClose={5000} theme='colored' transition={Slide} />
      <QueryClientProvider client={queryClient}>
        <ServicesContext.Provider value={{ ...queries }}>{children}</ServicesContext.Provider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export const useServicesContext = function (): ServicesContextProps {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServicesContext must be used within a ServicesContextProvider.');
  }
  return context;
};
