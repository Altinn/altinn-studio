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
  clearByPathPrefix: (prefix: string) => void;
  clearBackend: () => void;
  getFieldValidations: (path: string) => FieldValidation[];
  hasErrors: (path?: string) => boolean;
}

export type ValidationStore = ValidationState & ValidationActions;

export function createValidationStore() {
  return createStore<ValidationStore>()((set, get) => ({
    fieldValidations: {},
    setFieldValidations: (path, validations) =>
      set((state) => {
        const existing = state.fieldValidations[path];
        // Skip update if validations are identical to avoid unnecessary store notifications
        if (
          existing &&
          existing.length === validations.length &&
          existing.every((v, i) => v.severity === validations[i].severity && v.message === validations[i].message)
        ) {
          return state;
        }
        return { fieldValidations: { ...state.fieldValidations, [path]: validations } };
      }),
    clearField: (path) =>
      set((state) => {
        if (!(path in state.fieldValidations)) {
          return state;
        }
        const { [path]: _, ...rest } = state.fieldValidations;
        return { fieldValidations: rest };
      }),
    clearAll: () => set({ fieldValidations: {} }),
    clearByPathPrefix: (prefix) =>
      set((state) => {
        const hasMatch = Object.keys(state.fieldValidations).some((key) => key.startsWith(prefix));
        if (!hasMatch) {
          return state;
        }
        const kept: Record<string, FieldValidation[]> = {};
        for (const [key, value] of Object.entries(state.fieldValidations)) {
          if (!key.startsWith(prefix)) {
            kept[key] = value;
          }
        }
        return { fieldValidations: kept };
      }),
    clearBackend: () =>
      set((state) => {
        const hasBackend = Object.keys(state.fieldValidations).some((key) => !key.includes(':__'));
        if (!hasBackend) {
          return state;
        }
        const kept: Record<string, FieldValidation[]> = {};
        for (const [key, value] of Object.entries(state.fieldValidations)) {
          if (key.includes(':__')) {
            kept[key] = value;
          }
        }
        return { fieldValidations: kept };
      }),
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
