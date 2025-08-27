import type { TextResourceWithLanguage } from 'libs/studio-content-library/src';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';

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
