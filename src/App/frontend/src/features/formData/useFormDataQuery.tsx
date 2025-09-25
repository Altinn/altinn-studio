import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { type QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { isAxiosError } from 'src/utils/isAxiosError';
import { maybeAuthenticationRedirect } from 'src/utils/maybeAuthenticationRedirect';

export function useFormDataQueryDef(url: string | undefined): QueryDefinition<unknown> {
  const { fetchFormData } = useAppQueries();
  const queryKey = useFormDataQueryKey(url);
  const options = useFormDataQueryOptions();
  const isStateless = useApplicationMetadata().isStatelessApp;

  const queryFn = url ? () => fetchFormData(url, options) : skipToken;

  if (isStateless) {
    //  We need to refetch for stateless apps as caching will break some apps.
    // See this issue: https://github.com/Altinn/app-frontend-react/issues/2564
    return {
      queryKey,
      queryFn,
      gcTime: 0,
    };
  }

  return {
    queryKey,
    queryFn,
    refetchInterval: false,
  };
}

export function useFormDataQueryKey(url: string | undefined) {
  return useMemoDeepEqual(() => getFormDataQueryKey(url), [url]);
}

const formDataQueryKeys = {
  all: ['fetchFormData'] as const,
  withUrl: (url: string | undefined) => [...formDataQueryKeys.all, url ? getFormDataCacheKeyUrl(url) : url] as const,
};

export function getFormDataQueryKey(url: string | undefined) {
  return formDataQueryKeys.withUrl(url);
}

export async function invalidateFormDataQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: formDataQueryKeys.all });
}

export function useFormDataQueryOptions() {
  const selectedPartyId = useSelectedParty()?.partyId;
  const isStateless = useApplicationMetadata().isStatelessApp;
  const options: AxiosRequestConfig = {};
  if (isStateless && selectedPartyId !== undefined) {
    options.headers = {
      party: `partyid:${selectedPartyId}`,
    };
  }
  return options;
}

// We dont want to include the current language in the cacheKey url, but for stateless we still need to keep
// the 'dataType' query parameter in the cacheKey url to avoid caching issues.
function getFormDataCacheKeyUrl(url: string | undefined) {
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
        window.logInfo('Current party is missing roles');
      } else {
        window.logError('Fetching form data failed:\n', utils.error);
      }

      maybeAuthenticationRedirect(utils.error).then();
    }
  }, [url, utils.error]);

  return utils;
}
