import { useMemo } from 'react';

import type { AttachmentValidation, NodeRefValidation } from '..';

import { FormStore } from 'src/features/form/FormContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';

/**
 * Returns the validations for the given attachment.
 */
export function useAttachmentValidations(
  baseComponentId: string,
  attachmentId: string | undefined,
): NodeRefValidation<AttachmentValidation>[] {
  const showAll = FormStore.validation.useShowAllBackendErrors();
  const indexedId = useIndexedId(baseComponentId);
  const validations = FormStore.nodes.useVisibleValidations(indexedId, showAll);

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
