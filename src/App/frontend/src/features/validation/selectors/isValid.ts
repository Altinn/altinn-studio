import { FormStore } from 'src/features/form/FormContext';
import { useVisibleValidations } from 'src/features/validation/derivedValidations';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';

export function useIsValid(baseComponentId: string): boolean {
  const showAll = FormStore.validation.useShowAllUnboundValidations();
  const validations = useVisibleValidations(useIndexedId(baseComponentId), showAll);
  return !hasValidationErrors(validations);
}
