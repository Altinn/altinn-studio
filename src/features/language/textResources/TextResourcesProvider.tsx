import { useEffect } from 'react';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useQueryWithStaleData } from 'src/core/queries/useQueryWithStaleData';
import { useCurrentLanguage, useIsProfileLanguageLoaded } from 'src/features/language/LanguageProvider';
import { resourcesAsMap } from 'src/features/language/textResources/resourcesAsMap';
import { useAllowAnonymousIs } from 'src/features/stateless/getAllowAnonymous';
import type { ITextResourceResult, TextResourceMap } from 'src/features/language/textResources/index';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const convertResult = (result: ITextResourceResult): TextResourceMap => {
  const { resources } = result;
  return resourcesAsMap(resources);
};

const useTextResourcesQuery = () => {
  const { fetchTextResources } = useAppQueries();
  const selectedLanguage = useCurrentLanguage();

  // This makes sure to await potential profile fetching before fetching text resources
  const profileLanguageLoaded = useIsProfileLanguageLoaded();
  const isAnonymous = useAllowAnonymousIs(true);
  const enabled = isAnonymous || profileLanguageLoaded;

  const utils = {
    ...useQueryWithStaleData<ITextResourceResult, HttpClientError>({
      enabled,
      queryKey: ['fetchTextResources', selectedLanguage],
      queryFn: () => fetchTextResources(selectedLanguage),
    }),
    enabled,
  };

  useEffect(() => {
    utils.error && window.logError('Fetching text resources failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};

const { Provider, useCtx, useHasProvider } = delayedContext(() =>
  createQueryContext<ITextResourceResult, false, TextResourceMap>({
    name: 'TextResources',
    required: false,
    default: {},
    query: useTextResourcesQuery,
    process: convertResult,
  }),
);

export const TextResourcesProvider = Provider;
export const useTextResources = () => useCtx();
export const useHasTextResources = () => useHasProvider();
