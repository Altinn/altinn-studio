import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { buildNodeValidation, selectValidations, validationNodeFilter } from 'src/features/validation/utils';
import { useValidationContext } from 'src/features/validation/validationContext';
import { getResolvedVisibilityForAttachment } from 'src/features/validation/visibility/visibilityUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Returns the validations for the given attachment.
 */
export function useAttachmentValidations(node: LayoutNode, attachmentId: string | undefined): NodeValidation[] {
  const component = useValidationContext().state.components[node.item.id];
  const visibility = useValidationContext().visibility;

  return useMemo(() => {
    if (!component?.component || !attachmentId) {
      return [];
    }
    const validations = selectValidations(
      component.component!,
      getResolvedVisibilityForAttachment(attachmentId, node, visibility),
    );
    return validations
      .filter((validation) => validation.meta?.attachmentId === attachmentId)
      .filter(validationNodeFilter(node))
      .map((validation) => buildNodeValidation(node, validation));
  }, [component.component, node, attachmentId, visibility]);
}
