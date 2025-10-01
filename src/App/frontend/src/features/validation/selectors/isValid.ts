import { hasValidationErrors } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';

export function useIsValid(baseComponentId: string): boolean {
  const showAll = Validation.useShowAllBackendErrors();
  const validations = NodesInternal.useVisibleValidations(baseComponentId, showAll);
  return !hasValidationErrors(validations);
}
