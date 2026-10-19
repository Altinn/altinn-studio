import { skipToken } from '@tanstack/react-query';
import type { QueryClient, UseQueryOptions } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { useFormDataApi } from 'src/core/contexts/ApiProvider';
import { useIsStateless } from 'src/features/applicationMetadata';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';

export function useFormDataQueryDef(url: string | undefined): UseQueryOptions<unknown> {
  const { fetchFormData } = useFormDataApi();
  const queryKey = useFormDataQueryKey(url);
  const options = useFormDataQueryOptions();
  const queryFn = url ? () => fetchFormData(url, options) : skipToken;

  return {
    queryKey,
    queryFn,

    // We always have to refetch as caching will break some apps.
    // See this issue: https://github.com/Altinn/app-frontend-react/issues/2564
    // This is also important for https://github.com/Altinn/app-frontend-react/issues/3634, and without 'gcTime: 0'
    // old query cache will be used to initialize FormDataWrite even after invalidateFormDataQueries() has been called.
    gcTime: 0,

    refetchInterval: false,
  };
}

function useFormDataQueryKey(url: string | undefined) {
  return useMemoDeepEqual(() => getFormDataQueryKey(url), [url]);
}

const formDataQueryKeys = {
  all: ['fetchFormData'] as const,
  withUrl: (url: string | undefined) => [...formDataQueryKeys.all, url ? getFormDataCacheKeyUrl(url) : url] as const,
};

export function getFormDataQueryKey(url: string | undefined) {
  return formDataQueryKeys.withUrl(url);
}

function useFormDataQueryOptions() {
  const selectedPartyId = useSelectedParty()?.partyId;
  const isStateless = useIsStateless();
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

export async function invalidateFormDataQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ['fetchFormData'] });
}
