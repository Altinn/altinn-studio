import React, { ReactNode, createContext, useEffect, useMemo } from 'react';
import { ApplicationInsights, IConfiguration, IConfig } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

export type LoggerConfig = IConfiguration & IConfig;

const LoggerContext = createContext<ApplicationInsights | null>(null);

type LoggerContextProviderProps = {
  config: LoggerConfig;
  children: ReactNode;
};
export const LoggerContextProvider = ({
  children,
  config,
}: LoggerContextProviderProps): JSX.Element => {
  const reactPlugin = useMemo(() => new ReactPlugin(), []);

  const applicationinsights = useMemo(() => {
    // check if we have a instrumentationKey, if not, don't initialize app insights (we do not want AI to run on localhost)
    if (!config.instrumentationKey) return null;

    const insights = new ApplicationInsights({
      config: {
        ...config,
        extensions: [reactPlugin],
      },
    });

    insights.loadAppInsights();
    return insights;
  }, [config, reactPlugin]);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      console.log({ event, error: event.error });
      applicationinsights?.trackException({ error: event.error });
    };

    if (applicationinsights) {
      window.addEventListener('error', handleWindowError);

      return () => {
        window.removeEventListener('error', handleWindowError);
      };
    }
  }, [applicationinsights]);
  return <LoggerContext.Provider value={applicationinsights}>{children}</LoggerContext.Provider>;
};
