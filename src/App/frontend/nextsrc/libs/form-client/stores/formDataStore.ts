import dot from 'dot-object';
import { createStore } from 'zustand/vanilla';
import type { FormDataNode, FormDataPrimitive } from 'nextsrc/core/apiClient/dataApi';

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
}

export type FormDataStore = FormDataState & FormDataActions;

export interface FormDataStoreOptions {
  onChange?: (path: string, value: FormDataPrimitive) => void;
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
    setData: (data) => set({ data }),
    getValue: (path) => {
      const { data } = get();
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return null;
      }
      return (dot.pick(path, data) as FormDataPrimitive) ?? null;
    },
    setValue: (path, value) => {
      set((state) => {
        if (typeof state.data !== 'object' || state.data === null || Array.isArray(state.data)) {
          return state;
        }
        const copy = { ...state.data };
        dot.set(path, value, copy);
        return { data: copy };
      });
      options?.onChange?.(path, value);
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
      set((state) => {
        if (typeof state.data !== 'object' || state.data === null || Array.isArray(state.data)) {
          return state;
        }
        const currentVal = dot.pick(path, state.data) as FormDataPrimitive;
        if (currentVal === value) {
          return state;
        }
        const copy = { ...state.data };
        dot.set(path, value, copy);
        return { data: copy };
      });
      options?.onChange?.(path, value);
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
    },
  }));
}
