import { hasValidationErrors } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useIsValid(node: LayoutNode): boolean {
  const showAll = Validation.useShowAllBackendErrors();
  const validations = NodesInternal.useVisibleValidations(node, showAll);
  return !hasValidationErrors(validations);
}
