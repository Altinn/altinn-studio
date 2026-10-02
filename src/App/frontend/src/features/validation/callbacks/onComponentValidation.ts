import { useCallback, useEffect } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { ValidationMask } from 'src/features/validation';
import { getComponentValidationKey, getNodeRefValidations } from 'src/features/validation/deriveValidationState';
import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import { useWaitForValidation } from 'src/features/validation/validationContext';
import { useGetDerivedValidationState } from 'src/features/validation/validationHooks';
import { useCurrentRowContexts, useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { ComponentValidation } from 'src/features/validation';

/**
 * Publishes validations for temporary component inputs and runs a gate scoped to this component.
 * Data model bindings can be validated after the component has saved its result.
 */
export function useOnComponentValidation(baseComponentId: string) {
  const indexedId = useIndexedId(baseComponentId);
  const rowContexts = useCurrentRowContexts();
  const key = FormStore.raw.useMemoSelector((state) =>
    getComponentValidationKey(
      baseComponentId,
      rowContexts.map(({ groupBinding, rowIndex }) =>
        String(
          readDataFromState(state, {
            dataType: groupBinding.dataType,
            field: `${groupBinding.field}[${rowIndex}].${ALTINN_ROW_ID}`,
          }),
        ),
      ),
    ),
  );
  const setValidations = FormStore.raw.useStaticSelector((state) => state.validation.setComponentValidations);
  const setMask = FormStore.raw.useStaticSelector((state) => state.validation.setComponentMask);
  const getDerived = useGetDerivedValidationState();
  const waitForValidation = useWaitForValidation();

  const updateValidations = useCallback(
    (update: (previous: ComponentValidation[]) => ComponentValidation[]) => setValidations(key, update),
    [key, setValidations],
  );

  // Temporary inputs are discarded on unmount, so their validations must be discarded too.
  useEffect(() => () => setValidations(key, () => []), [key, setValidations]);

  const validate = useCallback(
    async (mask = ValidationMask.All) => {
      await waitForValidation();
      const errors = getNodeRefValidations(getDerived(), indexedId, mask, 'error');
      setMask(key, errors.length ? mask : undefined);
      return errors;
    },
    [getDerived, indexedId, key, setMask, waitForValidation],
  );

  return { updateValidations, validate };
}
