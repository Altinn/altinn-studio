import { useEffect } from 'react';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useQueryWithStaleData } from 'src/core/queries/useQueryWithStaleData';
import { useCurrentLanguage, useIsCurrentLanguageResolved } from 'src/features/language/LanguageProvider';
import { resourcesAsMap } from 'src/features/language/textResources/resourcesAsMap';
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
  const enabled = useIsCurrentLanguageResolved();

  const utils = {
    ...useQueryWithStaleData<TextResourceMap, HttpClientError>({
      enabled,
      queryKey: ['fetchTextResources', selectedLanguage],
      queryFn: async () => convertResult(await fetchTextResources(selectedLanguage)),
    }),
    enabled,
  };

  useEffect(() => {
    utils.error && window.logError('Fetching text resources failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};

const { Provider, useCtx, useHasProvider } = delayedContext(() =>
  createQueryContext<TextResourceMap, false>({
    name: 'TextResources',
    required: false,
    default: {},
    query: useTextResourcesQuery,
  }),
);

export const TextResourcesProvider = Provider;
export const useTextResources = () => useCtx();
export const useHasTextResources = () => useHasProvider();
