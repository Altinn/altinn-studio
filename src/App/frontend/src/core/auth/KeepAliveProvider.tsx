import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';
import { getEnvironmentLoginUrl } from 'src/utils/urls/appUrlHelper';

const ONE_MINUTE_IN_MILLISECONDS = 60000;
const TEN_MINUTE_IN_MILLISECONDS = ONE_MINUTE_IN_MILLISECONDS * 10;

const redirectToLogin = (appOidcProvider: string | null): void => {
  window.location.href = getEnvironmentLoginUrl(appOidcProvider);
};

const useRefreshJwtTokenQuery = (appOidcProvider: string | null | undefined, allowAnonymous: boolean | undefined) => {
  const { fetchRefreshJwtToken } = useAppQueries();
  const utils = useQuery({
    enabled: allowAnonymous === false, // Only refresh token at page load if allowAnonymous === false
    refetchOnWindowFocus: true,
    refetchInterval: TEN_MINUTE_IN_MILLISECONDS, // Refresh token every 10 minutes only if the tab is focused

    queryKey: ['refreshJwtToken'],
    queryFn: fetchRefreshJwtToken,
  });

  useEffect(() => {
    if (utils.error) {
      try {
        redirectToLogin(appOidcProvider || null);
      } catch {
        console.error(utils.error);
      }
    }
  }, [appOidcProvider, utils.error]);

  return utils;
};

const { Provider } = createContext<undefined>({
  name: 'KeepAlive',
  required: true,
});

export function KeepAliveProvider({ children }: PropsWithChildren) {
  const applicationSettings = useApplicationSettings();
  const allowAnonymous = useAllowAnonymous();

  useRefreshJwtTokenQuery(applicationSettings?.appOidcProvider, allowAnonymous);

  return <Provider value={undefined}>{children}</Provider>;
}
