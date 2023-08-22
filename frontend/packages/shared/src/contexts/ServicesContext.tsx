import React, { createContext, useContext, ReactNode, useState } from 'react';
import {
  MutationCache,
  MutationMeta,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  QueryMeta,
} from '@tanstack/react-query';
import type * as queries from '../api/queries';
import type * as mutations from '../api/mutations';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer, Slide, toast } from 'react-toastify';
import { ErrorBoundary } from 'react-error-boundary';
import { AxiosError } from 'axios';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from '@digdir/design-system-react';
import { ErrorBoundaryFallback } from '../components/ErrorBoundaryFallback';

import 'react-toastify/dist/ReactToastify.css';
import 'app-shared/styles/toast.css';

export type ServicesContextProps = typeof queries & typeof mutations;
export type ServicesContextProviderProps = ServicesContextProps & {
  children?: ReactNode;
  client?: QueryClient;
};

const ServicesContext = createContext<ServicesContextProps>(null);

const handleError = (
  error: AxiosError,
  t: (key: string) => string,
  meta: QueryMeta | MutationMeta,
): void => {
  // TODO : log axios errors
  // TODO : handle messages from API
  // TODO : logout user when session is expired

  if (
    meta?.hideDefaultError === true ||
    (meta?.hideDefaultError instanceof Function && meta?.hideDefaultError?.(error))
  )
    return;

  toast.error(() => (
    <Trans i18nKey={'general.error_message'} components={{ a: <Link inverted={true}>Slack</Link> }}/>
  ), { toastId: 'default' });
};

export const ServicesContextProvider = ({
  children,
  client,
  ...queries
}: ServicesContextProviderProps) => {
  const { t } = useTranslation();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: AxiosError, query) => handleError(error, t, query.options?.meta),
        }),
        mutationCache: new MutationCache({
          onError: (error: AxiosError, variables, context, mutation) => handleError(error, t, mutation.options?.meta),
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
      <ToastContainer
        position='top-center'
        autoClose={50000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        theme='colored'
        pauseOnHover
        transition={Slide}
      />
      <QueryClientProvider client={client || queryClient}>
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
