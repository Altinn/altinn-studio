import { type ReactNode, type JSX, createContext, useMemo, useRef, useState } from 'react';
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
  const [applicationInsights, setApplicationInsights] = useState<ApplicationInsights | null>(null);
  const hasAttemptedInitialization = useRef(false);

  if (environment?.aiConnectionString && !hasAttemptedInitialization.current) {
    hasAttemptedInitialization.current = true;
    setApplicationInsights(
      initializeApplicationInsights(environment.aiConnectionString, config, reactPlugin),
    );
  }

  return <LoggerContext.Provider value={applicationInsights}>{children}</LoggerContext.Provider>;
};

function initializeApplicationInsights(
  connectionString: string | undefined,
  config: LoggerConfig,
  reactPlugin: ReactPlugin,
): ApplicationInsights | null {
  if (!connectionString) return null;

  try {
    const insights = new ApplicationInsights({
      config: {
        ...config,
        connectionString,
        extensions: [reactPlugin as unknown as ITelemetryPlugin],
      },
    });

    insights.loadAppInsights();
    return insights;
  } catch (error) {
    console.error('Failed to initialize Application Insights:', error);
    return null;
  }
}
