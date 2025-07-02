import { useMemo } from 'react';

import type { AttachmentValidation, NodeRefValidation } from '..';

import { Validation } from 'src/features/validation/validationContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { NodesInternal } from 'src/utils/layout/NodesContext';

/**
 * Returns the validations for the given attachment.
 */
export function useAttachmentValidations(
  baseComponentId: string,
  attachmentId: string | undefined,
): NodeRefValidation<AttachmentValidation>[] {
  const showAll = Validation.useShowAllBackendErrors();
  const indexedId = useIndexedId(baseComponentId);
  const validations = NodesInternal.useVisibleValidations(indexedId, showAll);

  return useMemo(() => {
    if (!attachmentId) {
      return emptyArray;
    }

    return validations
      .filter((v) => 'attachmentId' in v && v.attachmentId === attachmentId)
      .map((validation) => ({
        ...validation,
        baseComponentId,
        nodeId: indexedId,
      })) as NodeRefValidation<AttachmentValidation>[];
  }, [attachmentId, baseComponentId, indexedId, validations]);
}

const emptyArray: never[] = [];
