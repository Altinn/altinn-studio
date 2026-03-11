import dot from 'dot-object';
import { createStore } from 'zustand/vanilla';
import type { FormDataNode, FormDataPrimitive } from 'nextsrc/core/api-client/data.api';

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

export interface ModelState {
  currentData: FormDataNode;
}

interface FormDataState {
  models: Record<string, ModelState>;
  defaultDataType: string;
}

export interface BindingContext {
  parentBinding?: string;
  itemIndex?: number;
  dataType?: string;
}

interface FormDataActions {
  setData: (data: FormDataNode, dataType?: string) => void;
  getValue: (path: string, dataType?: string) => FormDataPrimitive;
  setValue: (path: string, value: FormDataPrimitive, dataType?: string) => void;
  getBoundValue: (simpleBinding: string, bindingContext?: BindingContext) => FormDataPrimitive;
  setBoundValue: (simpleBinding: string, value: FormDataPrimitive, bindingContext?: BindingContext) => void;
  getArray: (path: string, bindingContext?: BindingContext) => FormDataNode[];
  pushArrayItem: (path: string, item: FormDataNode, bindingContext?: BindingContext) => void;
  removeArrayItem: (path: string, index: number, bindingContext?: BindingContext) => void;
}

export type FormDataStore = FormDataState & FormDataActions;

export interface FormDataStoreOptions {
  onChange?: (path: string, value: FormDataNode, previousValue: FormDataNode, dataType: string) => void;
  coerceValue?: (
    path: string,
    value: FormDataPrimitive,
    dataType: string,
  ) => { value: FormDataPrimitive; error: boolean };
}

function resolvePath(simpleBinding: string, parentBinding?: string, itemIndex?: number): string {
  if (parentBinding === undefined || itemIndex === undefined) {
    return simpleBinding;
  }
  const indexed = `${parentBinding}[${itemIndex}]`;
  if (simpleBinding === parentBinding) {
    return indexed;
  }
  if (simpleBinding.startsWith(`${parentBinding}.`)) {
    return indexed + simpleBinding.slice(parentBinding.length);
  }
  return simpleBinding;
}

function pickPrimitive(data: FormDataNode, path: string): FormDataPrimitive {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }
  return (dot.pick(path, data) as FormDataPrimitive) ?? null;
}

const EMPTY_MODEL: ModelState = { currentData: null };

function getModel(state: FormDataState, dataType?: string): ModelState {
  const dt = dataType ?? state.defaultDataType;
  return state.models[dt] ?? EMPTY_MODEL;
}

function isRecordData(data: FormDataNode): data is Record<string, FormDataNode> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function updateModel(
  state: FormDataState,
  dt: string,
  updater: (data: Record<string, FormDataNode>) => Record<string, FormDataNode>,
): FormDataState {
  const model = getModel(state, dt);
  if (!isRecordData(model.currentData)) {
    return state;
  }
  return {
    defaultDataType: state.defaultDataType,
    models: { ...state.models, [dt]: { currentData: updater(model.currentData) } },
  };
}

export const selectCurrentData = (state: FormDataStore): FormDataNode =>
  state.models[state.defaultDataType]?.currentData ?? null;

export function createFormDataStore(defaultDataType: string, initial?: FormDataNode, options?: FormDataStoreOptions) {
  return createStore<FormDataStore>()((set, get) => ({
    defaultDataType,
    models: {
      [defaultDataType]: { currentData: initial ?? null },
    },

    setData: (data, dataType?) => {
      const dt = dataType ?? get().defaultDataType;
      set((state) => {
        const existing = state.models[dt];
        if (existing && deepEqual(existing.currentData, data)) {
          return state;
        }
        return {
          models: { ...state.models, [dt]: { currentData: data } },
        };
      });
    },

    getValue: (path, dataType?) => pickPrimitive(getModel(get(), dataType).currentData, path),

    setValue: (path, value, dataType?) => {
      const dt = dataType ?? get().defaultDataType;
      const coerced = options?.coerceValue?.(path, value, dt);
      if (coerced) {
        if (coerced.error) {
          return;
        }
        value = coerced.value;
      }

      const previousValue = get().getValue(path, dt);
      if (previousValue === value) {
        return;
      }

      set((state) =>
        updateModel(state, dt, (data) => {
          const copy = { ...data };
          dot.set(path, value, copy);
          return copy;
        }),
      );
      options?.onChange?.(path, value, previousValue, dt);
    },

    getBoundValue: (simpleBinding, bindingContext?) => {
      const path = resolvePath(simpleBinding, bindingContext?.parentBinding, bindingContext?.itemIndex);
      return pickPrimitive(getModel(get(), bindingContext?.dataType).currentData, path);
    },

    setBoundValue: (simpleBinding, value, bindingContext?) => {
      const dt = bindingContext?.dataType ?? get().defaultDataType;
      const path = resolvePath(simpleBinding, bindingContext?.parentBinding, bindingContext?.itemIndex);

      const coerced = options?.coerceValue?.(path, value, dt);
      if (coerced) {
        if (coerced.error) {
          return;
        }
        value = coerced.value;
      }

      const previousValue = get().getBoundValue(simpleBinding, bindingContext);
      if (previousValue === value) {
        return;
      }

      set((state) =>
        updateModel(state, dt, (data) => {
          const copy = { ...data };
          dot.set(path, value, copy);
          return copy;
        }),
      );
      options?.onChange?.(path, value, previousValue, dt);
    },

    getArray: (path, bindingContext?) => {
      const { currentData } = getModel(get(), bindingContext?.dataType);
      if (!isRecordData(currentData)) {
        return [];
      }
      const resolvedPath = resolvePath(path, bindingContext?.parentBinding, bindingContext?.itemIndex);
      const result = dot.pick(resolvedPath, currentData);
      return Array.isArray(result) ? result : [];
    },

    pushArrayItem: (path, item, bindingContext?) => {
      const dt = bindingContext?.dataType ?? get().defaultDataType;
      const resolvedPath = resolvePath(path, bindingContext?.parentBinding, bindingContext?.itemIndex);
      const previousArray = get().getArray(path, bindingContext);

      set((state) =>
        updateModel(state, dt, (data) => {
          const current = dot.pick(resolvedPath, data);
          const arr = Array.isArray(current) ? [...current, item] : [item];
          const copy = { ...data };
          dot.set(resolvedPath, arr, copy);
          return copy;
        }),
      );
      const newArray = get().getArray(path, bindingContext);
      options?.onChange?.(resolvedPath, newArray, previousArray, dt);
    },

    removeArrayItem: (path, index, bindingContext?) => {
      const dt = bindingContext?.dataType ?? get().defaultDataType;
      const resolvedPath = resolvePath(path, bindingContext?.parentBinding, bindingContext?.itemIndex);
      const previousArray = get().getArray(path, bindingContext);

      set((state) =>
        updateModel(state, dt, (data) => {
          const current = dot.pick(resolvedPath, data);
          if (!Array.isArray(current) || index < 0 || index >= current.length) {
            return data;
          }
          const arr = [...current.slice(0, index), ...current.slice(index + 1)];
          const copy = { ...data };
          dot.set(resolvedPath, arr, copy);
          return copy;
        }),
      );
      const newArray = get().getArray(path, bindingContext);
      options?.onChange?.(resolvedPath, newArray, previousArray, dt);
    },
  }));
}
