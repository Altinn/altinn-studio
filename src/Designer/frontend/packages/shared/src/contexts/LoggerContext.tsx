import { type ReactNode } from 'react';
import { createContext, useEffect, useMemo } from 'react';
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

  const applicationInsights = useMemo(
    () => createApplicationInsights(environment?.aiConnectionString, config, reactPlugin),
    [config, reactPlugin, environment],
  );

  useEffect(() => {
    if (!applicationInsights) return;

    const handleWindowError = (event: ErrorEvent) =>
      trackException(applicationInsights, event.error);

    window.addEventListener('error', handleWindowError);
    return () => window.removeEventListener('error', handleWindowError);
  }, [applicationInsights]);

  return <LoggerContext.Provider value={applicationInsights}>{children}</LoggerContext.Provider>;
};

function createApplicationInsights(
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

function trackException(applicationInsights: ApplicationInsights, error: Error): void {
  try {
    applicationInsights.trackException({ error });
  } catch (trackingError) {
    console.error('Failed to track exception in Application Insights:', trackingError);
  }
}
