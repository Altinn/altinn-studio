import { useEffect } from 'react';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useQueryWithStaleData } from 'src/core/queries/useQueryWithStaleData';
import { resourcesAsMap } from 'src/features/language/textResources/resourcesAsMap';
import { useCurrentLanguage, useIsCurrentLanguageResolved } from 'src/features/language/useAppLanguages';
import type { ITextResourceResult, TextResourceMap } from 'src/features/language/textResources/index';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const convertResult = (result: ITextResourceResult): TextResourceMap => {
  const { resources } = result;
  return resourcesAsMap(resources);
};

const useTextResourcesQuery = () => {
  const { fetchTextResources } = useAppQueries();
  const selectedLanguage = useCurrentLanguage();
  // debugger;
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

export const useTextResources = () => useTextResourcesQuery().data as TextResourceMap;
export const useHasTextResources = () => true;
