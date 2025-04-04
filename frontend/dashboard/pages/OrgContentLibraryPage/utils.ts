import type {
  TextResources as LibraryTextResources,
  TextResourceWithLanguage as LibraryTextResourceWithLanguage,
} from '@studio/content-library';
import { ArrayUtils } from '@studio/pure-functions';
import type { UpdateTextResourcesForOrgMutationArgs } from 'app-shared/hooks/mutations/useUpdateTextResourcesForOrgMutation';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';

export function textResourceWithLanguageToMutationArgs({
  language,
  textResource,
}: LibraryTextResourceWithLanguage): UpdateTextResourcesForOrgMutationArgs {
  return { language, payload: [textResource] };
}

export function textResourcesWithLanguageToLibraryTextResources(
  textResourcesWithLanguage: ITextResourcesWithLanguage,
): LibraryTextResources {
  const list: ITextResourcesWithLanguage[] = [textResourcesWithLanguage];
  return ArrayUtils.extractKeyValuePairs(list, 'language', 'resources');
}
