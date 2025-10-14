import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';
import type { MutationMeta, QueryClientConfig, QueryMeta } from '@tanstack/react-query';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as queries from '../api/queries';
import type * as mutations from '../api/mutations';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ToastOptions } from 'react-toastify';
import { ToastContainer, Slide, toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { isAxiosError } from 'axios';
import type { i18n } from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import type { ApiError } from 'app-shared/types/api/ApiError';

import 'react-toastify/dist/ReactToastify.css';
import 'app-shared/styles/toast.css';
import { userLogoutAfterPath } from 'app-shared/api/paths';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { Link } from '@digdir/designsystemet-react';

export type ServicesContextProps = typeof queries & typeof mutations;
export type ServicesContextProviderProps = ServicesContextProps & {
  children?: ReactNode;
  client?: QueryClient; // TODO : #10913 should probably be removed to force the use of QueryCache and MutationCache
  clientConfig?: QueryClientConfig;
};

const LOG_OUT_TIMER_MS = 5000;

const ServicesContext = createContext<ServicesContextProps>(undefined);

const handleError = (
  error: AxiosError<ApiError>,
  t: (key: string) => string,
  i18n: i18n,
  meta: QueryMeta | MutationMeta,
  logout: () => Promise<void>,
): void => {
  if (!isAxiosError(error)) {
    console.error(error);
  }

  const renderToast = (key: string, options: ToastOptions = {}) => {
    const errorMessageKey = `api_errors.${key}`;
    if (i18n.exists(errorMessageKey)) {
      toast.error(t(errorMessageKey), {
        toastId: errorMessageKey,
        ...options,
      });
    } else {
      renderDefaultToast();
    }
  };

  const errorCode = error?.response?.data?.errorCode;
  const unAuthorizedErrorCode = error?.response?.status === ServerCodes.Unauthorized;

  if (unAuthorizedErrorCode) {
    return renderToast(errorCode || 'Unauthorized', {
      onClose: () => logout().then(() => window.location.assign(userLogoutAfterPath())),
      autoClose: LOG_OUT_TIMER_MS,
    });
  }

  if (
    meta?.hideDefaultError === true ||
    (meta?.hideDefaultError instanceof Function && meta?.hideDefaultError?.(error))
  )
    return;

  if (errorCode) {
    return renderToast(errorCode);
  }

  renderDefaultToast();
};

const renderDefaultToast = () => {
  toast.error(
    () => (
      <div>
        <Trans
          i18nKey={'general.error_message'}
          components={{
            a: (
              <Link href='/info/contact' inverted={true}>
                {' '}
              </Link>
            ),
          }}
        />
      </div>
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
    <>
      <ToastContainer position='top-center' theme='colored' transition={Slide} draggable={false} />
      <QueryClientProvider client={queryClient}>
        <ServicesContext.Provider value={{ ...queries }}>{children}</ServicesContext.Provider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </>
  );
};

export const useServicesContext = function (): ServicesContextProps {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServicesContext must be used within a ServicesContextProvider.');
  }
  return context;
};
