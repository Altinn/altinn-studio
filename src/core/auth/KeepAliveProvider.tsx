import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { DeprecatedActions } from 'src/redux/deprecatedSlice';
import { getEnvironmentLoginUrl } from 'src/utils/urls/appUrlHelper';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const ONE_MINUTE_IN_MILLISECONDS = 60000;
const TEN_MINUTE_IN_MILLISECONDS = ONE_MINUTE_IN_MILLISECONDS * 10;

const redirectToLogin = (appOidcProvider: string | null): void => {
  window.location.href = getEnvironmentLoginUrl(appOidcProvider);
};

const useRefreshJwtTokenQuery = (appOidcProvider: string | null | undefined, allowAnonymous: boolean | undefined) => {
  const { fetchRefreshJwtToken } = useAppQueries();
  return useQuery({
    enabled: allowAnonymous === false, // Only refresh token at page load if allowAnonymous === false
    refetchOnWindowFocus: true,
    refetchInterval: TEN_MINUTE_IN_MILLISECONDS, // Refresh token every 10 minutes only if the tab is focused

    queryKey: ['refreshJwtToken'],
    queryFn: fetchRefreshJwtToken,
    onError: (error: HttpClientError) => {
      try {
        redirectToLogin(appOidcProvider || null);
      } catch {
        console.error(error);
      }
    },
  });
};

const { Provider } = createContext<undefined>({
  name: 'KeepAlive',
  required: true,
});

export function KeepAliveProvider({ children }: PropsWithChildren) {
  const applicationSettings = useApplicationSettings();
  const allowAnonymous = useAllowAnonymous();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(DeprecatedActions.setAnonymous(allowAnonymous));
  }, [allowAnonymous, dispatch]);

  useRefreshJwtTokenQuery(applicationSettings?.appOidcProvider, allowAnonymous);

  return <Provider value={undefined}>{children}</Provider>;
}
