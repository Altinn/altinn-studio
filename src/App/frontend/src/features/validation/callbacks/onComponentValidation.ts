import { FormStore } from 'src/features/form/FormContext';
import { ValidationMask } from 'src/features/validation';
import { getNodeRefValidations } from 'src/features/validation/deriveValidationState';
import { useWaitForValidation } from 'src/features/validation/validationContext';
import { useGetDerivedValidationState } from 'src/features/validation/validationHooks';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';
import { useComponentStateKey, useIndexedId } from 'src/utils/layout/DataModelLocation';

/** Reveals errors for this component using the same derived validations as the other gates. */
export function useOnComponentValidation(baseComponentId: string) {
  const indexedId = useIndexedId(baseComponentId);
  const componentKey = useComponentStateKey(baseComponentId);
  const setMask = FormStore.validation.useSetComponentValidationMask();
  const getDerived = useGetDerivedValidationState();
  const waitForValidation = useWaitForValidation();
  const callback = useOurEffectEvent((mask: number) => {
    const errors = getNodeRefValidations(getDerived(), indexedId, mask, 'error');
    setMask(componentKey, errors.length ? mask : undefined);
    return errors;
  });

  return async (mask = ValidationMask.All) => {
    await waitForValidation();
    return callback(mask);
  };
}
