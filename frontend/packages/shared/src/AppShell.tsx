import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import i18next from 'i18next';
import { initReactI18next, Trans, useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import nb from '@altinn-studio/language/src/nb.json';
import en from '@altinn-studio/language/src/en.json';

import type { MutationMeta, QueryMeta, QueryClientConfig } from '@tanstack/react-query';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import type { LoggerConfig } from './contexts/LoggerContext';
import { LoggerContextProvider } from './contexts/LoggerContext';
import { altinnStudioEnvironment } from './utils/altinnStudioEnv';
import { ErrorBoundaryFallback } from './components/ErrorBoundaryFallback';
import type { i18n } from 'i18next';

import { ErrorBoundary } from 'react-error-boundary';
import type { ToastOptions } from 'react-toastify';
import { ToastContainer, Slide, toast } from 'react-toastify';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { userLogoutAfterPath } from 'app-shared/api/paths';

import type { ApiError } from './types/api/ApiError';
import { Link } from '@digdir/designsystemet-react';
import { Routes } from './Routes';
import { combineComponents } from './contexts/combineComponents';

import 'react-toastify/dist/ReactToastify.css';
import '@digdir/designsystemet-theme/brand/altinn/tokens.css';
import '@digdir/designsystemet-css/index.css';
import './styles/toast.css';
import './styles/global.css';

i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  resources: {
    nb: { translation: nb },
    en: { translation: en },
  },
  fallbackLng: 'nb',
  react: {
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['em'],
  },
});

const loggerConfig: LoggerConfig = {
  connectionString: altinnStudioEnvironment.aiConnectionString,
  enableUnhandledPromiseRejectionTracking: true,
  loggingLevelTelemetry: 2,
};

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
};

const LOG_OUT_TIMER_MS = 5000;

const handleError = (
  error: AxiosError<ApiError>,
  t: (key: string) => string,
  i18n: i18n,
  meta: QueryMeta | MutationMeta,
  logout: () => Promise<void>,
): void => {
  // TODO : log axios errors

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

  const LogOutUser = () => logout().then(() => window.location.assign(userLogoutAfterPath()));

  if (unAuthorizedErrorCode) {
    renderToast(errorCode || 'Unauthorized', {
      onClose: LogOutUser,
      autoClose: LOG_OUT_TIMER_MS,
    });
    setTimeout(() => {
      LogOutUser();
    }, LOG_OUT_TIMER_MS);
    return;
  }

  if (errorCode) {
    return renderToast(errorCode);
  }

  if (
    meta?.hideDefaultError === true ||
    (meta?.hideDefaultError instanceof Function && meta?.hideDefaultError?.(error))
  )
    return;

  renderDefaultToast();
};

const renderDefaultToast = () => {
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

type AppShellProps = {
  basename: string;
  providers?: (({ children }: Partial<any>) => JSX.Element)[];
  routes: ReactNode;
  client?: QueryClient; // TODO : #10913 should probably be removed to force the use of QueryCache and MutationCache
  clientConfig?: QueryClientConfig;
};

export const AppShell = ({
  basename,
  providers,
  routes,
  client,
  clientConfig = queryClientConfig,
}: AppShellProps) => {
  const { t, i18n } = useTranslation();

  const [queryClient] = useState(
    () =>
      client ||
      new QueryClient({
        ...clientConfig,
        queryCache: new QueryCache({
          onError: (error: AxiosError<ApiError>, query) =>
            handleError(error, t, i18n, query.options?.meta, mutations.logout),
        }),
        mutationCache: new MutationCache({
          onError: (error: AxiosError<ApiError>, variables, context, mutation) =>
            handleError(error, t, i18n, mutation.options?.meta, mutations.logout),
        }),
      }),
  );

  const Providers =
    providers && providers.length > 0
      ? combineComponents(...providers)
      : ({ children }: { children?: ReactNode }) => <>{children}</>;

  return (
    <ErrorBoundary
      FallbackComponent={ErrorBoundaryFallback}
      onError={() => {
        // TODO : log rendering errors
      }}
    >
      <LoggerContextProvider config={loggerConfig}>
        <ToastContainer
          position='top-center'
          theme='colored'
          transition={Slide}
          draggable={false}
        />
        <QueryClientProvider client={queryClient}>
          <ServicesContextProvider {...queries} {...mutations}>
            <Providers>
              <Routes basename={basename} routes={routes} />
            </Providers>
          </ServicesContextProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </LoggerContextProvider>
    </ErrorBoundary>
  );
};
