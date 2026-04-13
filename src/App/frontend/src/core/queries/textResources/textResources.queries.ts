import { queryOptions } from '@tanstack/react-query';

import type { TextResourcesApi } from 'src/core/api-client/textResources.api';
import type { IRawTextResource, ITextResourceResult, TextResourceMap } from 'src/features/language/textResources';

export const textResourcesQueryKeys = {
  all: () => ['textResources'] as const,
  textResources: (selectedLanguage: string) => [...textResourcesQueryKeys.all(), selectedLanguage] as const,
};

interface TextResourcesQueryParams {
  selectedLanguage: string;
  textResourcesFromWindow: ITextResourceResult | undefined;
  textResourcesApi: TextResourcesApi;
}

export function textResourcesQuery({
  selectedLanguage,
  textResourcesFromWindow,
  textResourcesApi,
}: TextResourcesQueryParams) {
  return queryOptions({
    queryKey: textResourcesQueryKeys.textResources(selectedLanguage),
    queryFn: async () => {
      if (!textResourcesFromWindow) {
        window.logWarnOnce(
          'Could not find any text resources, even on window. Does the app include any text resource files?',
        );
        // Backend couldn't find any text resources, no point in fetching anything.
        return EMPTY_TEXT_RESOURCES;
      }

      const textResourceResult =
        textResourcesFromWindow.language === selectedLanguage
          ? textResourcesFromWindow
          : await textResourcesApi.fetchTextResources(selectedLanguage);

      return resourcesAsMap(textResourceResult.resources);
    },
    placeholderData: (placeholderData) => placeholderData ?? EMPTY_TEXT_RESOURCES,
  });
}

const EMPTY_TEXT_RESOURCES: TextResourceMap = {};

export function resourcesAsMap(resources: IRawTextResource[]): TextResourceMap {
  return resources.reduce((acc, { id, ...resource }) => ({ ...acc, [id]: resource }), {});
}
