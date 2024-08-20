import { useCallback } from 'react';

import { getVisibilityMask } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Sets attachment validations as visible for when an attachment is saved (tag is changed).
 */
export function useOnAttachmentSave() {
  const validating = Validation.useValidating();
  const setAttachmentVisibility = NodesInternal.useSetAttachmentVisibility();

  return useCallback(
    async (node: LayoutNode, attachmentId: string) => {
      const mask = getVisibilityMask(['All']);

      // Making sure the validations are available before we try to mark them visible
      await validating();

      setAttachmentVisibility(attachmentId, node, mask);
    },
    [setAttachmentVisibility, validating],
  );
}
