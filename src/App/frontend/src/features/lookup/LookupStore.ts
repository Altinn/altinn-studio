import { useCallback } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { useComponentStateKey } from 'src/utils/layout/DataModelLocation';
import type { LookupFailure } from 'src/core/queries/lookup';
import type { FormStoreSet, FormStoreState } from 'src/features/form/FormContext';

export type LookupInput =
  | { type: 'PersonLookup'; ssn: string; lastName: string; failure?: LookupFailure }
  | { type: 'OrganizationLookup'; orgNr: string; failure?: LookupFailure };

export interface LookupSliceState {
  inputs: Record<string, LookupInput | undefined>;
  setLookupInput: (componentKey: string, input: LookupInput) => void;
  clearLookupInput: (componentKey: string) => void;
}

/** Search inputs are temporary and must not overwrite the data model's lookup result. */
export function createLookupSlice(set: FormStoreSet): FormStoreState['lookup'] {
  return {
    inputs: {},
    setLookupInput: (componentKey, input) =>
      set((state) => {
        state.lookup.inputs[componentKey] = input;
      }),
    clearLookupInput: (componentKey) =>
      set((state) => {
        delete state.lookup.inputs[componentKey];
      }),
  };
}

export function useLookupInput(baseComponentId: string) {
  const componentKey = useComponentStateKey(baseComponentId);
  const input = FormStore.raw.useSelector((state) => state.lookup.inputs[componentKey]);
  const setInput = FormStore.raw.useStaticSelector((state) => state.lookup.setLookupInput);
  const clearInput = FormStore.raw.useStaticSelector((state) => state.lookup.clearLookupInput);
  const clear = useCallback(() => clearInput(componentKey), [clearInput, componentKey]);

  return {
    input,
    setInput: useCallback((input: LookupInput) => setInput(componentKey, input), [componentKey, setInput]),
    clearInput: clear,
  };
}
