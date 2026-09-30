import { FormStore } from 'src/features/form/FormContext';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useVisibleValidations } from 'src/features/validation/validationHooks';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';

export function useIsValid(baseComponentId: string): boolean {
  const showAll = FormStore.validation.useShowAllUnboundValidations();
  const validations = useVisibleValidations(baseComponentId, useIndexedId(baseComponentId), showAll);
  return !hasValidationErrors(validations);
}
