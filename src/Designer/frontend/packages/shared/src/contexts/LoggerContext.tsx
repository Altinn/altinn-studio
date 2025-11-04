import { type ReactNode } from 'react';
import React, { createContext, useEffect, useMemo } from 'react';
import type { IConfiguration, IConfig, ITelemetryPlugin } from '@microsoft/applicationinsights-web';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { useEnvironmentConfig } from './EnvironmentConfigContext';

export type LoggerConfig = IConfiguration & IConfig;

const LoggerContext = createContext<ApplicationInsights | null>(null);

export type LoggerContextProviderProps = {
  config: LoggerConfig;
  children: ReactNode;
};
export const LoggerContextProvider = ({
  children,
  config,
}: LoggerContextProviderProps): JSX.Element => {
  const reactPlugin = useMemo(() => new ReactPlugin(), []);
  const { environment } = useEnvironmentConfig();

  const applicationInsights = useMemo(() => {
    // check if we have a connectionString, if not, don't initialize app insights (we do not want AI to run on localhost)
    if (!environment?.aiConnectionString) return null;

    const insights = new ApplicationInsights({
      config: {
        ...config,
        connectionString: environment.aiConnectionString,
        extensions: [reactPlugin as unknown as ITelemetryPlugin],
      },
    });

    insights.loadAppInsights();
    return insights;
  }, [config, reactPlugin, environment]);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      applicationInsights?.trackException({ error: event.error });
    };

    if (applicationInsights) {
      window.addEventListener('error', handleWindowError);

      return () => {
        window.removeEventListener('error', handleWindowError);
      };
    }
  }, [applicationInsights]);
  return <LoggerContext.Provider value={applicationInsights}>{children}</LoggerContext.Provider>;
};
