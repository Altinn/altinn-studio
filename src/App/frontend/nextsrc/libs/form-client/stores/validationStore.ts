import { createStore } from 'zustand/vanilla';

export interface FieldValidation {
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface ValidationState {
  fieldValidations: Record<string, FieldValidation[]>;
}

interface ValidationActions {
  setFieldValidations: (path: string, validations: FieldValidation[]) => void;
  clearField: (path: string) => void;
  clearAll: () => void;
  getFieldValidations: (path: string) => FieldValidation[];
  hasErrors: (path?: string) => boolean;
}

export type ValidationStore = ValidationState & ValidationActions;

export function createValidationStore() {
  return createStore<ValidationStore>()((set, get) => ({
    fieldValidations: {},
    setFieldValidations: (path, validations) =>
      set((state) => ({
        fieldValidations: { ...state.fieldValidations, [path]: validations },
      })),
    clearField: (path) =>
      set((state) => {
        const { [path]: _, ...rest } = state.fieldValidations;
        return { fieldValidations: rest };
      }),
    clearAll: () => set({ fieldValidations: {} }),
    getFieldValidations: (path) => get().fieldValidations[path] ?? [],
    hasErrors: (path) => {
      const validations = get().fieldValidations;
      if (path) {
        return (validations[path] ?? []).some((v) => v.severity === 'error');
      }
      return Object.values(validations).some((list) => list.some((v) => v.severity === 'error'));
    },
  }));
}
