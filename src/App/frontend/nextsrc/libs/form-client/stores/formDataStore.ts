import dot from 'dot-object';
import { createStore } from 'zustand/vanilla';
import { ArrayUtils } from 'nextsrc/libs/pure-functions/ArrayUtils/ArrayUtils';
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
  const resolvedDataType = dataType ?? state.defaultDataType;
  return state.models[resolvedDataType] ?? EMPTY_MODEL;
}

function isRecordData(data: FormDataNode): data is Record<string, FormDataNode> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function updateModel(
  state: FormDataState,
  dataType: string,
  updater: (currentModel: Record<string, FormDataNode>) => Record<string, FormDataNode>,
): FormDataState {
  const model = getModel(state, dataType);
  if (!isRecordData(model.currentData)) {
    return state;
  }
  return {
    defaultDataType: state.defaultDataType,
    models: { ...state.models, [dataType]: { currentData: updater(model.currentData) } },
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
      const resolvedDataType = dataType ?? get().defaultDataType;
      set((state) => {
        const existing = state.models[resolvedDataType];
        if (existing && deepEqual(existing.currentData, data)) {
          return state;
        }
        return {
          models: { ...state.models, [resolvedDataType]: { currentData: data } },
        };
      });
    },

    getValue: (path, dataType?) => pickPrimitive(getModel(get(), dataType).currentData, path),

    setValue: (path, value, dataType?) => {
      const resolvedDataType = dataType ?? get().defaultDataType;
      const coerced = options?.coerceValue?.(path, value, resolvedDataType);
      if (coerced) {
        if (coerced.error) {
          return;
        }
        value = coerced.value;
      }

      const previousValue = get().getValue(path, resolvedDataType);
      if (previousValue === value) {
        return;
      }

      set((state) =>
        updateModel(state, resolvedDataType, (currentModel) => {
          const updatedModel = { ...currentModel };
          dot.set(path, value, updatedModel);
          return updatedModel;
        }),
      );
      options?.onChange?.(path, value, previousValue, resolvedDataType);
    },

    getBoundValue: (simpleBinding, bindingContext?) => {
      const path = resolvePath(simpleBinding, bindingContext?.parentBinding, bindingContext?.itemIndex);
      return pickPrimitive(getModel(get(), bindingContext?.dataType).currentData, path);
    },

    setBoundValue: (simpleBinding, value, bindingContext?) => {
      const resolvedDataType = bindingContext?.dataType ?? get().defaultDataType;
      const path = resolvePath(simpleBinding, bindingContext?.parentBinding, bindingContext?.itemIndex);

      const coerced = options?.coerceValue?.(path, value, resolvedDataType);
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
        updateModel(state, resolvedDataType, (currentModel) => {
          const updatedModel = { ...currentModel };
          dot.set(path, value, updatedModel);
          return updatedModel;
        }),
      );
      options?.onChange?.(path, value, previousValue, resolvedDataType);
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

    pushArrayItem: (path, newRow, bindingContext?) => {
      const resolvedDataType = bindingContext?.dataType ?? get().defaultDataType;
      const resolvedPath = resolvePath(path, bindingContext?.parentBinding, bindingContext?.itemIndex);
      const previousRows = get().getArray(path, bindingContext);

      set((state) =>
        updateModel(state, resolvedDataType, (currentModel) => {
          const existingRows = dot.pick(resolvedPath, currentModel);
          const updatedRows = Array.isArray(existingRows) ? [...existingRows, newRow] : [newRow];
          const updatedModel = { ...currentModel };
          dot.set(resolvedPath, updatedRows, updatedModel);
          return updatedModel;
        }),
      );
      const currentRows = get().getArray(path, bindingContext);
      options?.onChange?.(resolvedPath, currentRows, previousRows, resolvedDataType);
    },

    removeArrayItem: (path, index, bindingContext?) => {
      const resolvedDataType = bindingContext?.dataType ?? get().defaultDataType;
      const resolvedPath = resolvePath(path, bindingContext?.parentBinding, bindingContext?.itemIndex);
      const previousRows = get().getArray(path, bindingContext);

      set((state) =>
        updateModel(state, resolvedDataType, (currentModel) => {
          const existingRows = dot.pick(resolvedPath, currentModel);
          if (!Array.isArray(existingRows) || index < 0 || index >= existingRows.length) {
            return currentModel;
          }
          const updatedRows = ArrayUtils.removeAtIndex(existingRows, index);
          const updatedModel = { ...currentModel };
          dot.set(resolvedPath, updatedRows, updatedModel);
          return updatedModel;
        }),
      );
      const currentRows = get().getArray(path, bindingContext);
      options?.onChange?.(resolvedPath, currentRows, previousRows, resolvedDataType);
    },
  }));
}
