import React, { ReactNode, createContext } from 'react';
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
  const reactPlugin = new ReactPlugin();

  // check if we have a connection string, if not, don't initialize app insights (we do not want AI to run on localhost)
  const applicationinsights = config.connectionString
    ? new ApplicationInsights({
        config: {
          ...config,
          extensions: [reactPlugin],
        },
      })
    : null;

  if (applicationinsights) {
    applicationinsights.loadAppInsights();
  }
  return <LoggerContext.Provider value={applicationinsights}>{children}</LoggerContext.Provider>;
};
