import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import i18next from 'i18next';
import { initReactI18next, Trans, useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import { isAxiosError, isCancel } from 'axios';

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
import type { i18n } from 'i18next';

import type { ToastOptions } from 'react-toastify';
import { ToastContainer, Slide, toast } from 'react-toastify';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { userLogoutAfterPath } from 'app-shared/api/paths';

import type { ApiError } from './types/api/ApiError';
import { Link } from '@digdir/designsystemet-react';
import { Routes } from './routes/Routes';
import { combineComponents } from './contexts/combineComponents';

import 'react-toastify/dist/ReactToastify.css';
import '@digdir/designsystemet-theme/brand/altinn/tokens.css';
import '@digdir/designsystemet-css/index.css';
import './styles/toast.css';
import './styles/global.css';
import { EnvironmentConfigProvider } from './contexts/EnvironmentConfigContext';
import { FeatureFlagsProvider } from '@studio/feature-flags';

if (!i18next.isInitialized) {
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
}

const loggerConfig: LoggerConfig = {
  connectionString: altinnStudioEnvironment.aiConnectionString,
  enableUnhandledPromiseRejectionTracking: true,
  loggingLevelTelemetry: 2,
};

const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
};

const PassthroughProviders = ({ children }: { children?: ReactNode }) => <>{children}</>;

const LOG_OUT_TIMER_MS = 5000;

const handleError = (
  error: AxiosError<ApiError>,
  t: (key: string) => string,
  i18n: i18n,
  meta: QueryMeta | MutationMeta,
  logout: () => Promise<void>,
): void => {
  if (isCancel(error)) {
    return;
  }

  if (!isAxiosError(error)) {
    console.error(error);
  }

  const renderToast = (key: string, detail?: string, options: ToastOptions = {}) => {
    const errorMessageKey = `api_errors.${key}`;
    if (i18n.exists(errorMessageKey)) {
      const message = (
        <>
          {t(errorMessageKey)}{' '}
          {detail && (
            <>
              <br />
              {`${t('app_error.details')}: ${detail}`}
            </>
          )}
        </>
      );
      toast.error(message, {
        toastId: errorMessageKey,
        ...options,
      });
    } else {
      renderDefaultToast();
    }
  };

  const errorCode = error?.response?.data?.errorCode;
  const detail = error?.response?.data?.detail;
  const unAuthorizedErrorCode = error?.response?.status === ServerCodes.Unauthorized;

  if (unAuthorizedErrorCode) {
    return renderToast(errorCode || 'Unauthorized', detail, {
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
    return renderToast(errorCode, detail);
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

type AppShellProps = {
  basename: string;
  providers?: (({ children }: Partial<any>) => JSX.Element)[];
  routes: ReactNode;
};

export const AppShell = ({ basename, providers, routes }: AppShellProps) => {
  const { t, i18n } = useTranslation();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        ...defaultQueryClientConfig,
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
    providers && providers.length > 0 ? combineComponents(...providers) : PassthroughProviders;

  return (
    <EnvironmentConfigProvider>
      <FeatureFlagsProvider>
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
      </FeatureFlagsProvider>
    </EnvironmentConfigProvider>
  );
};
