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
}

export type FormDataStore = FormDataState & FormDataActions;

export interface FormDataStoreOptions {
  onChange?: (path: string, value: FormDataPrimitive) => void;
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
        dot.str(path, value, copy);
        return { data: copy };
      });
      options?.onChange?.(path, value);
    },
  }));
}
