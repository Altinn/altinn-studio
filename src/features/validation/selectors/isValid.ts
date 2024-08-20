import { hasValidationErrors } from 'src/features/validation/utils';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useIsValid(node: LayoutNode): boolean {
  const validations = NodesInternal.useVisibleValidations(node);
  return !hasValidationErrors(validations);
}
