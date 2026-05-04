import {
  resourcesAsMap as resourcesAsMapCore,
  useTextResourcesQuery as useTextResourcesQueryCore,
} from 'src/core/queries/textResources';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import type { TextResourceMap } from 'src/features/language/textResources/index';

export const resourcesAsMap = resourcesAsMapCore;

export function useTextResources(): TextResourceMap {
  const selectedLanguage = useCurrentLanguage();
  const query = useTextResourcesQueryCore({
    selectedLanguage,
    textResourcesFromWindow: window.altinnAppGlobalData.textResources,
  });

  if (!query.data) {
    window.logError('Fetching text resources failed:\n', query.error);
    throw new Error(
      'Text resources query did not return data. This should not happen. Something is possibly wrong with the query.',
    );
  }

  return query.data;
}
