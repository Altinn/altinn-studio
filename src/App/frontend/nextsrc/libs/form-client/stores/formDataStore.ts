import dot from 'dot-object';
import { createStore } from 'zustand/vanilla';

import type { FormDataNode, FormDataPrimitive } from 'nextsrc/core/apiClient/dataApi';

function deepEqual(a: FormDataNode, b: FormDataNode): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  // JSON.stringify comparison is sufficient for plain form data (no functions,
  // dates, or circular references) and avoids generating a full diff patch.
  return JSON.stringify(a) === JSON.stringify(b);
}

interface FormDataState {
  data: FormDataNode;
}

interface FormDataActions {
  setData: (data: FormDataNode) => void;
  getValue: (path: string) => FormDataPrimitive;
  setValue: (path: string, value: FormDataPrimitive) => void;
  getBoundValue: (simpleBinding: string, parentBinding?: string, itemIndex?: number) => FormDataPrimitive;
  setBoundValue: (simpleBinding: string, value: FormDataPrimitive, parentBinding?: string, itemIndex?: number) => void;
  getArray: (path: string, parentBinding?: string, itemIndex?: number) => FormDataNode[];
  pushArrayItem: (path: string, item: FormDataNode, parentBinding?: string, itemIndex?: number) => void;
  removeArrayItem: (path: string, index: number, parentBinding?: string, itemIndex?: number) => void;
}

export type FormDataStore = FormDataState & FormDataActions;

export interface FormDataStoreOptions {
  onChange?: (path: string, value: FormDataNode, previousValue: FormDataNode) => void;
  coerceValue?: (path: string, value: FormDataPrimitive) => { value: FormDataPrimitive; error: boolean };
}

function resolvePath(simpleBinding: string, parentBinding?: string, itemIndex?: number): string {
  if (parentBinding === undefined || itemIndex === undefined) {
    return simpleBinding;
  }
  const parts = simpleBinding.split('.');
  return `${parentBinding}[${itemIndex}].${parts[parts.length - 1]}`;
}

export function createFormDataStore(initial?: FormDataNode, options?: FormDataStoreOptions) {
  return createStore<FormDataStore>()((set, get) => ({
    data: initial ?? null,
    setData: (data) =>
      set((state) => {
        // Skip update if the data is deeply equal to avoid replacing object
        // references and triggering re-renders in useGroupArray/useShallow
        // subscribers (e.g. after backend save returns identical data).
        if (deepEqual(state.data, data)) {
          return state;
        }
        return { data };
      }),
    getValue: (path) => {
      const { data } = get();
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return null;
      }
      return (dot.pick(path, data) as FormDataPrimitive) ?? null;
    },
    setValue: (path, value) => {
      const coerced = options?.coerceValue?.(path, value);
      if (coerced) {
        if (coerced.error) {
          return; // Invalid value — don't update store
        }
        value = coerced.value;
      }

      const previousValue = get().getValue(path);
      if (previousValue === value) {
        return;
      }
      set((state) => {
        if (typeof state.data !== 'object' || state.data === null || Array.isArray(state.data)) {
          return state;
        }
        const copy = { ...state.data };
        dot.set(path, value, copy);
        return { data: copy };
      });
      options?.onChange?.(path, value, previousValue);
    },
    getBoundValue: (simpleBinding, parentBinding?, itemIndex?) => {
      const { data } = get();
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return null;
      }
      const path = resolvePath(simpleBinding, parentBinding, itemIndex);
      return (dot.pick(path, data) as FormDataPrimitive) ?? null;
    },
    setBoundValue: (simpleBinding, value, parentBinding?, itemIndex?) => {
      const path = resolvePath(simpleBinding, parentBinding, itemIndex);

      const coerced = options?.coerceValue?.(path, value);
      if (coerced) {
        if (coerced.error) {
          return; // Invalid value — don't update store
        }
        value = coerced.value;
      }

      const previousValue = get().getBoundValue(simpleBinding, parentBinding, itemIndex);
      if (previousValue === value) {
        return;
      }
      set((state) => {
        if (typeof state.data !== 'object' || state.data === null || Array.isArray(state.data)) {
          return state;
        }
        const copy = { ...state.data };
        dot.set(path, value, copy);
        return { data: copy };
      });
      options?.onChange?.(path, value, previousValue);
    },
    getArray: (path, parentBinding?, itemIndex?) => {
      const { data } = get();
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return [];
      }
      const resolvedPath = resolvePath(path, parentBinding, itemIndex);
      const result = dot.pick(resolvedPath, data);
      return Array.isArray(result) ? result : [];
    },
    pushArrayItem: (path, item, parentBinding?, itemIndex?) => {
      const resolvedPath = resolvePath(path, parentBinding, itemIndex);
      const previousArray = get().getArray(path, parentBinding, itemIndex);
      set((state) => {
        if (typeof state.data !== 'object' || state.data === null || Array.isArray(state.data)) {
          return state;
        }
        const current = dot.pick(resolvedPath, state.data);
        const arr = Array.isArray(current) ? [...current, item] : [item];
        const copy = { ...state.data };
        dot.set(resolvedPath, arr, copy);
        return { data: copy };
      });
      const newArray = get().getArray(path, parentBinding, itemIndex);
      options?.onChange?.(resolvedPath, newArray, previousArray);
    },
    removeArrayItem: (path, index, parentBinding?, itemIndex?) => {
      const resolvedPath = resolvePath(path, parentBinding, itemIndex);
      const previousArray = get().getArray(path, parentBinding, itemIndex);
      set((state) => {
        if (typeof state.data !== 'object' || state.data === null || Array.isArray(state.data)) {
          return state;
        }
        const current = dot.pick(resolvedPath, state.data);
        if (!Array.isArray(current) || index < 0 || index >= current.length) {
          return state;
        }
        const arr = [...current.slice(0, index), ...current.slice(index + 1)];
        const copy = { ...state.data };
        dot.set(resolvedPath, arr, copy);
        return { data: copy };
      });
      const newArray = get().getArray(path, parentBinding, itemIndex);
      options?.onChange?.(resolvedPath, newArray, previousArray);
    },
  }));
}
