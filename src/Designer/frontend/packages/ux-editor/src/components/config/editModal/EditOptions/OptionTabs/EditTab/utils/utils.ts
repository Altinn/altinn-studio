import type {
  TextResource,
  TextResources,
  TextResourceWithLanguage,
} from '@studio/content-library';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';

export const getTextResourcesForLanguage = (
  language: string,
  textResources?: TextResources,
): TextResource[] | undefined => textResources?.[language];

export const createTextResourceWithLanguage = (
  language: string,
  textResource: TextResource,
): TextResourceWithLanguage => ({ language, textResource });

export function convertTextResourceToMutationArgs({
  textResource,
  language,
}: TextResourceWithLanguage): UpsertTextResourceMutation {
  return {
    textId: textResource.id,
    language,
    translation: textResource.value,
  };
}
