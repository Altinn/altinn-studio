import { useCallback } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import type { LookupFailure } from 'src/core/queries/lookup';
import type { FormStoreSet, FormStoreState } from 'src/features/form/FormContext';

export type LookupInput =
  | { type: 'PersonLookup'; ssn: string; lastName: string; failure?: LookupFailure }
  | { type: 'OrganizationLookup'; orgNr: string; failure?: LookupFailure };

export interface LookupSliceState {
  inputs: Record<string, LookupInput | undefined>;
  setLookupInput: (indexedId: string, input: LookupInput) => void;
  clearLookupInput: (indexedId: string) => void;
}

/** Search inputs are temporary and must not overwrite the data model's lookup result. */
export function createLookupSlice(set: FormStoreSet): FormStoreState['lookup'] {
  return {
    inputs: {},
    setLookupInput: (indexedId, input) =>
      set((state) => {
        state.lookup.inputs[indexedId] = input;
      }),
    clearLookupInput: (indexedId) =>
      set((state) => {
        delete state.lookup.inputs[indexedId];
      }),
  };
}

export function useLookupInput(indexedId: string) {
  const input = FormStore.raw.useSelector((state) => state.lookup.inputs[indexedId]);
  const setInput = FormStore.raw.useStaticSelector((state) => state.lookup.setLookupInput);
  const clearInput = FormStore.raw.useStaticSelector((state) => state.lookup.clearLookupInput);
  const clear = useCallback(() => clearInput(indexedId), [clearInput, indexedId]);

  return {
    input,
    setInput: useCallback((input: LookupInput) => setInput(indexedId, input), [indexedId, setInput]),
    clearInput: clear,
  };
}
