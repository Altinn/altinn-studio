import { FormStore } from 'src/features/form/FormContext';
import type { FormStoreSet, FormStoreState } from 'src/features/form/FormContext';

export interface LayoutDiagnosticErrors {
  // The key is the error message, making sure we do not store duplicates.
  [key: string]: true;
}

export type LayoutDiagnosticsSliceState = {
  hasErrors: boolean;
  errors: Record<string, LayoutDiagnosticErrors | undefined>;
  addError: (error: string, id: string, type: 'node' | 'page') => void;
  replaceErrors: (errors: Record<string, string[]>) => void;
  reset: () => void;
};

const defaultState = {
  hasErrors: false,
  errors: {},
};

export function createLayoutDiagnosticsSlice(set: FormStoreSet): FormStoreState['layoutDiagnostics'] {
  return {
    ...structuredClone(defaultState),
    addError: (error, id, type) =>
      set((state) => {
        const key = `${type}/${id}`;
        state.layoutDiagnostics.errors[key] ??= {};
        state.layoutDiagnostics.errors[key][error] = true;
        state.layoutDiagnostics.hasErrors = true;
      }),
    replaceErrors: (errors) =>
      set((state) => {
        const nextErrors: Record<string, LayoutDiagnosticErrors> = {};
        for (const [key, messages] of Object.entries(errors)) {
          nextErrors[key] = Object.fromEntries(messages.map((message) => [message, true]));
        }
        state.layoutDiagnostics.errors = nextErrors;
        state.layoutDiagnostics.hasErrors = Object.keys(nextErrors).length > 0;
      }),
    reset: () =>
      set((state) => {
        Object.assign(state.layoutDiagnostics, structuredClone(defaultState));
      }),
  };
}

export const layoutDiagnosticsHooks = {
  useFullErrorList: () =>
    FormStore.raw.useMemoSelector((state) =>
      Object.fromEntries(
        Object.entries(state.layoutDiagnostics.errors)
          .filter((entry): entry is [string, LayoutDiagnosticErrors] => entry[1] !== undefined)
          .map(([key, errors]) => [key, Object.keys(errors)]),
      ),
    ),
  useNodeErrors: (nodeId: string | undefined) =>
    FormStore.raw.useSelector((state) => (nodeId ? state.layoutDiagnostics.errors[`node/${nodeId}`] : undefined)),
  useHasErrors: () => FormStore.raw.useSelector((state) => state.layoutDiagnostics.hasErrors),
  useAddError: () => FormStore.raw.useStaticSelector((state) => state.layoutDiagnostics.addError),
};
