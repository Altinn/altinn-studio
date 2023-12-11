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
import type { i18n } from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { ErrorBoundaryFallback } from '../components/ErrorBoundaryFallback';
import { ApiError } from 'app-shared/types/api/ApiError';

import 'react-toastify/dist/ReactToastify.css';
import 'app-shared/styles/toast.css';
import { userLogoutAfterPath } from 'app-shared/api/paths';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { Link } from '@digdir/design-system-react';

export type ServicesContextProps = typeof queries & typeof mutations;
export type ServicesContextProviderProps = ServicesContextProps & {
  children?: ReactNode;
  client?: QueryClient; // TODO : #10913 should probably be removed to force the use of QueryCache and MutationCache
  clientConfig?: QueryClientConfig;
};

const ServicesContext = createContext<ServicesContextProps>(null);

const handleError = (
  error: AxiosError<ApiError>,
  t: (key: string) => string,
  i18n: i18n,
  meta: QueryMeta | MutationMeta,
  logout: () => Promise<void>,
): void => {
  // TODO : log axios errors

  if (error?.response?.status === ServerCodes.Unauthorized) {
    logout().then(() => window.location.assign(userLogoutAfterPath()));
    return;
  }

  if (
    meta?.hideDefaultError === true ||
    (meta?.hideDefaultError instanceof Function && meta?.hideDefaultError?.(error))
  )
    return;

  const errorCode = error?.response?.data?.errorCode;
  if (errorCode) {
    const errorMessageKey = `api_errors.${errorCode}`;

    if (i18n.exists(errorMessageKey)) {
      toast.error(t(errorMessageKey), { toastId: errorMessageKey });
      return;
    }
  }

  toast.error(
    () => (
      <Trans
        i18nKey={'general.error_message'}
        components={{
          a: (
            <Link href='/contact' inverted={true}>
              {' '}
            </Link>
          ),
        }}
      />
    ),
    { toastId: 'default' },
  );
};

export const ServicesContextProvider = ({
  children,
  client,
  clientConfig,
  ...queries
}: ServicesContextProviderProps) => {
  const { t, i18n } = useTranslation();

  const [queryClient] = useState(
    () =>
      client ||
      new QueryClient({
        ...clientConfig,
        queryCache: new QueryCache({
          onError: (error: AxiosError<ApiError>, query) =>
            handleError(error, t, i18n, query.options?.meta, queries.logout),
        }),
        mutationCache: new MutationCache({
          onError: (error: AxiosError<ApiError>, variables, context, mutation) =>
            handleError(error, t, i18n, mutation.options?.meta, queries.logout),
        }),
      }),
  );

  return (
    <ErrorBoundary
      FallbackComponent={ErrorBoundaryFallback}
      onError={() => {
        // TODO : log rendering errors
      }}
    >
      <ToastContainer position='top-center' theme='colored' transition={Slide} draggable={false} />
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
