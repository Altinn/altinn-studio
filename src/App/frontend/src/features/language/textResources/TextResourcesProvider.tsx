import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { resourcesAsMap } from 'src/features/language/textResources/resourcesAsMap';
import { fetchTextResources } from 'src/queries/queries';
import type { ITextResourceResult, TextResourceMap } from 'src/features/language/textResources/index';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const EMPTY_TEXT_RESOURCES: TextResourceMap = {};

export function toTextResourceMap(result: ITextResourceResult): TextResourceMap {
  const { resources } = result;
  return resourcesAsMap(resources);
}

function getTextResourcesFromWindow() {
  return window.altinnAppGlobalData.textResources;
}
function getTextResourceQueryKey(selectedLanguage: string) {
  return ['fetchTextResources', selectedLanguage] as const;
}

function useTextResourcesQuery() {
  const selectedLanguage = useCurrentLanguage();

  // This makes sure to await potential profile fetching before fetching text resources
  const textResourcesFromWindow = getTextResourcesFromWindow();

  const query = useQuery<TextResourceMap, HttpClientError>({
    queryKey: getTextResourceQueryKey(selectedLanguage),
    queryFn: async () => {
      const textResourceResult =
        textResourcesFromWindow && textResourcesFromWindow.language === selectedLanguage
          ? textResourcesFromWindow
          : await fetchTextResources(selectedLanguage);

      return toTextResourceMap(textResourceResult);
    },
  });

  useEffect(() => {
    query.error && window.logError('Fetching text resources failed:\n', query.error);
  }, [query.error]);

  return query;
}

export function useTextResources(): TextResourceMap {
  const query = useTextResourcesQuery();
  if (!query.data && query.isFetched) {
    window.logWarnOnce(
      'Could not find any text resources, even on window. Does the app include any text resource files?',
    );
  }

  return query.data ?? EMPTY_TEXT_RESOURCES;
}
