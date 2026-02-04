import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { fetchTextResources } from 'src/queries/queries';
import type { IRawTextResource, TextResourceMap } from 'src/features/language/textResources/index';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const EMPTY_TEXT_RESOURCES: TextResourceMap = {};

export function resourcesAsMap(resources: IRawTextResource[]): TextResourceMap {
  return resources.reduce((acc, { id, ...resource }) => ({ ...acc, [id]: resource }), {});
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
      if (!textResourcesFromWindow) {
        window.logWarnOnce(
          'Could not find any text resources, even on window. Does the app include any text resource files?',
        );
        // Backend couldn't find any text resources, to no point in fetching anything.
        return EMPTY_TEXT_RESOURCES;
      }
      const textResourceResult =
        textResourcesFromWindow.language === selectedLanguage
          ? textResourcesFromWindow
          : await fetchTextResources(selectedLanguage);

      return resourcesAsMap(textResourceResult.resources);
    },
    placeholderData: (placeholderData) => placeholderData ?? EMPTY_TEXT_RESOURCES,
  });

  useEffect(() => {
    query.error && window.logError('Fetching text resources failed:\n', query.error);
  }, [query.error]);

  return query;
}

export function useTextResources(): TextResourceMap {
  const query = useTextResourcesQuery();
  if (!query.data) {
    throw new Error(
      'Text resources query did not return data. This should not happen. Something is possibly wrong with the query.',
    );
  }

  return query.data;
}
