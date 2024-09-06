import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { type QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { isAxiosError } from 'src/utils/isAxiosError';
import { maybeAuthenticationRedirect } from 'src/utils/maybeAuthenticationRedirect';

export function useFormDataQueryDef(url: string | undefined): QueryDefinition<unknown> {
  const { fetchFormData } = useAppQueries();
  const queryKey = useFormDataQueryKey(url);
  const options = useFormDataQueryOptions();
  return {
    queryKey,
    queryFn: url ? () => fetchFormData(url, options) : skipToken,
    enabled: !!url,
    refetchInterval: false,
  };
}

export function useFormDataQueryKey(url: string | undefined) {
  return useMemoDeepEqual(() => getFormDataQueryKey(url), [url]);
}

export function getFormDataQueryKey(url: string | undefined) {
  return ['fetchFormData', getFormDataCacheKeyUrl(url)];
}

export function useFormDataQueryOptions() {
  const currentPartyId = useCurrentParty()?.partyId;
  const isStateless = useApplicationMetadata().isStatelessApp;
  const options: AxiosRequestConfig = {};
  if (isStateless && currentPartyId !== undefined) {
    options.headers = {
      party: `partyid:${currentPartyId}`,
    };
  }
  return options;
}

// We dont want to include the current language in the cacheKey url, but for stateless we still need to keep
// the 'dataType' query parameter in the cacheKey url to avoid caching issues.
export function getFormDataCacheKeyUrl(url: string | undefined) {
  if (!url) {
    return undefined;
  }
  const urlObj = new URL(url);
  const searchParams = new URLSearchParams(urlObj.search);
  searchParams.delete('language');
  return `${urlObj.pathname}?${searchParams.toString()}`;
}

export function useFormDataQuery(url: string | undefined) {
  const def = useFormDataQueryDef(url);
  const utils = useQuery(def);

  useEffect(() => {
    if (utils.error && isAxiosError(utils.error)) {
      if (utils.error.message?.includes('403')) {
        // This renders the <MissingRolesError /> component in the provider
        window.logInfo('Current party is missing roles');
      } else {
        window.logError('Fetching form data failed:\n', utils.error);
      }

      maybeAuthenticationRedirect(utils.error).then();
    }
  }, [utils.error]);

  return utils;
}
