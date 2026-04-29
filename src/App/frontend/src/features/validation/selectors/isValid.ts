import { FormStore } from 'src/features/form/FormContext';
import { hasValidationErrors } from 'src/features/validation/utils';

export function useIsValid(baseComponentId: string): boolean {
  const showAll = FormStore.validation.useShowAllBackendErrors();
  const validations = FormStore.nodes.useVisibleValidations(baseComponentId, showAll);
  return !hasValidationErrors(validations);
}
