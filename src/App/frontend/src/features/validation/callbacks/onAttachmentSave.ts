import { useCallback } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { getVisibilityMask } from 'src/features/validation/utils';
import { useWaitForValidation } from 'src/features/validation/validationContext';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';

/**
 * Sets attachment validations as visible for when an attachment is saved (tag is changed).
 */
export function useOnAttachmentSave() {
  const validating = useWaitForValidation();
  const setAttachmentVisibility = FormStore.nodes.useSetAttachmentVisibility();
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
