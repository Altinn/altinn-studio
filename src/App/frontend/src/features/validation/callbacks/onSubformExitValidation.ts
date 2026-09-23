import { useCallback } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { FormStore } from 'src/features/form/FormContext';
import { hasInvalidFormData } from 'src/features/formData/FormDataWrite';
import { ValidationMask } from 'src/features/validation';

/** Prevent leaving a subform with input that cannot be saved to the backend. */
export function useOnSubformExitValidation() {
  const store = FormStore.raw.useLaxStore();
  const waitForSave = FormStore.data.useWaitForSave();

  return useCallback(async () => {
    if (store === ContextNotProvided || !hasInvalidFormData(store.getState())) {
      return false;
    }

    await waitForSave(true);
    const state = store.getState();
    if (hasInvalidFormData(state)) {
      state.validation.setFormMask(state.validation.formMask | ValidationMask.Invalid);
      return true;
    }
    return false;
  }, [store, waitForSave]);
}
