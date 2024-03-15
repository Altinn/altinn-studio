import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { buildNodeValidation, filterValidations, selectValidations } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { getResolvedVisibilityForAttachment } from 'src/features/validation/visibility/visibilityUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Returns the validations for the given attachment.
 */
export function useAttachmentValidations(node: LayoutNode, attachmentId: string | undefined): NodeValidation[] {
  const componentSelector = Validation.useComponentSelector();
  const visibilitySelector = Validation.useVisibilitySelector();

  return useMemo(() => {
    const component = componentSelector(node.item.id, (components) => components[node.item.id]);
    if (!component?.component || !attachmentId) {
      return [];
    }
    const validations = filterValidations(
      selectValidations(
        component.component!,
        getResolvedVisibilityForAttachment(attachmentId, node, visibilitySelector),
      ),
      node,
    );
    return validations
      .filter((validation) => validation.meta?.attachmentId === attachmentId)
      .map((validation) => buildNodeValidation(node, validation));
  }, [componentSelector, node, attachmentId, visibilitySelector]);
}
