import { useCallback } from 'react';
import type { TextResource } from '@studio/components-legacy';
import { createTextResourceWithLanguage, convertTextResourceToMutationArgs } from '../utils';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';

export function useHandleUpdateTextResource(
  language: string,
  updateTextResource: (args: UpsertTextResourceMutation) => void,
  doReloadPreview?: () => void,
) {
  return useCallback(
    (textResource: TextResource) => {
      const updatedTextResource = createTextResourceWithLanguage(language, textResource);
      const mutationArgs = convertTextResourceToMutationArgs(updatedTextResource);
      updateTextResource(mutationArgs);
      if (doReloadPreview) {
        doReloadPreview();
      }
    },
    [updateTextResource, doReloadPreview, language],
  );
}
