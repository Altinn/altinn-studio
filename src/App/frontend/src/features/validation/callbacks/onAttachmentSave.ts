import { useCallback } from 'react';

import { getVisibilityMask } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import { NodesInternal } from 'src/utils/layout/NodesContext';

/**
 * Sets attachment validations as visible for when an attachment is saved (tag is changed).
 */
export function useOnAttachmentSave() {
  const validating = Validation.useValidating();
  const setAttachmentVisibility = NodesInternal.useSetAttachmentVisibility();
  const idMutator = useComponentIdMutator();

  return useCallback(
    async (baseComponentId: string, attachmentId: string) => {
      const mask = getVisibilityMask(['All']);

      // Making sure the validations are available before we try to mark them visible
      await validating();

      setAttachmentVisibility(attachmentId, idMutator(baseComponentId), mask);
    },
    [setAttachmentVisibility, validating, idMutator],
  );
}
