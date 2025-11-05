import React, { type ReactNode, type ReactElement, useEffect, useState, useMemo } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PostHogReactProvider } from '@posthog/react';
import { useEnvironmentConfig } from '../EnvironmentConfigContext';

export type PostHogContextProviderProps = {
  children: ReactNode;
};

export const PostHogContextProvider = ({ children }: PostHogContextProviderProps): ReactElement => {
  const { environment } = useEnvironmentConfig();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!environment || isInitialized) return;

    if (environment.postHogApiKey) {
      posthog.init(environment.postHogApiKey, {
        api_host: environment.postHogApiHost,
        opt_out_capturing_by_default: true,
        persistence: 'memory',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
      });
      setIsInitialized(true);
    }
  }, [environment, isInitialized]);

  const posthogClient = useMemo(() => posthog, []);

  return <PostHogReactProvider client={posthogClient}>{children}</PostHogReactProvider>;
};
