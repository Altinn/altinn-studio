import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueriesContext } from 'src/contexts/appQueriesContext';
import { getEnvironmentLoginUrl } from 'src/utils/urls/appUrlHelper';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const redirectToLogin = (appOidcProvider: string | null): void => {
  window.location.href = getEnvironmentLoginUrl(appOidcProvider);
};

enum ServerStateCacheKey {
  RefreshJwtToken = 'refreshJwtToken',
}

export const useRefreshJwtTokenQuery = (
  appOidcProvider: string | null,
  options: {
    enabled: boolean;
    refetchOnWindowFocus: boolean;
    refetchInterval: number;
  },
): UseQueryResult<void> => {
  const { fetchRefreshJwtToken } = useAppQueriesContext();
  return useQuery([ServerStateCacheKey.RefreshJwtToken], fetchRefreshJwtToken, {
    ...options,
    onError: (error: HttpClientError) => {
      try {
        redirectToLogin(appOidcProvider || null);
      } catch {
        console.error(error);
      }
    },
  });
};
