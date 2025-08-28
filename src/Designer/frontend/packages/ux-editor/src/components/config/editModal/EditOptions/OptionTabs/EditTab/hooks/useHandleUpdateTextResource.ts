import { useCallback } from 'react';
import type { TextResource } from '@studio/components-legacy';
import { createTextResourceWithLanguage, convertTextResourceToMutationArgs } from '../utils';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export function useHandleUpdateTextResource(language: string, doReloadPreview?: () => void) {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: updateTextResource } = useUpsertTextResourceMutation(org, app);

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
