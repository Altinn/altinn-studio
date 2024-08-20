import { useMemo } from 'react';

import type { AttachmentValidation, NodeValidation } from '..';

import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AttachmentsPlugin } from 'src/features/attachments/AttachmentsPlugin';
import type { ValidationPlugin } from 'src/features/validation/ValidationPlugin';
import type { CompWithPlugin } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ValidTypes = CompWithPlugin<AttachmentsPlugin> & CompWithPlugin<ValidationPlugin>;

/**
 * Returns the validations for the given attachment.
 */
export function useAttachmentValidations(
  node: LayoutNode<ValidTypes>,
  attachmentId: string | undefined,
): NodeValidation<AttachmentValidation>[] {
  const validations = NodesInternal.useVisibleValidations(node);

  return useMemo(() => {
    if (!attachmentId) {
      return emptyArray;
    }

    return validations
      .filter((v) => 'attachmentId' in v && v.attachmentId === attachmentId)
      .map((validation) => ({ ...validation, node })) as NodeValidation<AttachmentValidation>[];
  }, [attachmentId, node, validations]);
}

const emptyArray: never[] = [];
