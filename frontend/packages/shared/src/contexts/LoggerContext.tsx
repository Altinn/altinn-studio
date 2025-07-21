import { type ReactNode } from 'react';
import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { IConfiguration, IConfig, ITelemetryPlugin } from '@microsoft/applicationinsights-web';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import type { AltinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';
import axios from 'axios';
import { envFilePath } from 'app-shared/api/paths';

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
  const [environment, setEnvironment] = useState<AltinnStudioEnvironment>(null);

  const fetchConfig = async () => {
    const response = await axios
      .get(envFilePath())
      .catch((error) =>
        console.warn(
          'Could not load environment file. This is expected for local dev environments.',
          error,
        ),
      );
    if (response) return response.data as AltinnStudioEnvironment;
  };

  useEffect(() => {
    fetchConfig().then(setEnvironment);
  }, []);

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
