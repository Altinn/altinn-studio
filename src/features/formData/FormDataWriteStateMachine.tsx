import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';
import { applyPatch } from 'fast-json-patch';
import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { convertData } from 'src/features/formData/convertData';
import { createPatch } from 'src/features/formData/jsonPatch/createPatch';
import { runLegacyRules } from 'src/features/formData/LegacyRules';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import type { SchemaLookupTool } from 'src/features/datamodel/DataModelSchemaProvider';
import type { IRuleConnections } from 'src/features/form/dynamics';
import type { FDLeafValue } from 'src/features/formData/FormDataWrite';
import type { FormDataWriteProxies, Proxy } from 'src/features/formData/FormDataWriteProxies';
import type { JsonPatch } from 'src/features/formData/jsonPatch/types';
import type { BackendValidationIssueGroups } from 'src/features/validation';

export interface FormDataState {
  // These values contain the current data model, with the values immediately available whenever the user is typing.
  // Use these values to render the form, and for other cases where you need the current data model immediately.
  currentData: object;

  // This is a key-value map of invalid data, where the key is the (dot) path in the current data model to where
  // the data would be located. In the currentData/debounced object(s), these values will be missing/undefined.
  // The point of these values is for the data model to _seem like_ it can store anything, even though some values
  // are simply not valid according to the JsonSchema we need to follow. This is useful for example when the user
  // is typing a number, as the current model is updated for every keystroke, but if the user types '-5', the model
  // will be invalid until the user types the '5' as well. This way we can show the user the value they are typing,
  // as they are typing it, while also keeping it away from the data model until it is valid to store in it.
  invalidCurrentData: object;

  // These values contain the current data model, with the values debounced at 400ms. This means that if the user is
  // typing, the values will be updated 400ms after the user stopped typing. Use these values when you need to perform
  // expensive operations on the data model, such as validation, calculations, or sending a request to save the model.
  debouncedCurrentData: object;

  // These values contain the last saved data model, with the values that were last saved to the server. We use this
  // to determine if there are any unsaved changes, and to diff the current data model against the last saved data
  // model when saving. You probably don't need to use these values directly unless you know what you're doing.
  lastSavedData: object;

  // Simple flag to track whether there are any unsaved changes in the data model. At every debounce, this will
  // compare the current data model against the last saved data model, and as soon as users are typing into the form
  // this value will be set to true (although it may flip back to false when debouncing, if the value stays the same
  // as what we have saved to the server).
  hasUnsavedChanges: boolean;

  // This contains the validation issues we receive from the server last time we saved the data model.
  validationIssues: BackendValidationIssueGroups | undefined;

  // Control state is used to control the behavior of form data.
  controlState: {
    // The time in milliseconds to debounce the currentData model. This is used to determine how long to wait after the
    // user has stopped typing before updating that data into the debouncedCurrentData model. Usually this will follow
    // the default value, it can also be changed at any time by each component that uses the FormDataWriter.
    debounceTimeout: number;

    // Auto-saving is turned on by default, and will automatically save the data model to the server whenever the
    // debouncedCurrentData model changes. This can be turned off when, for example, you want to save the data model
    // only when the user navigates to another page.
    autoSaving: boolean;

    // This is used to track whether the data model is currently being saved to the server.
    isSaving: boolean;

    // This is used to track whether the user has requested a manual save. When auto-saving is turned off, this is
    // the way we track when to save the data model to the server. It can also be used to trigger a manual save
    // as a way to immediately save the data model to the server, for example before locking the data model.
    manualSaveRequested: boolean;

    // This is used to track which component is currently blocking the auto-saving feature. If this is set to a string
    // value, auto-saving will be disabled, even if the autoSaving flag is set to true. This is useful when you want
    // to temporarily disable auto-saving, for example when clicking a CustomButton and waiting for the server to
    // respond. The server might read the data model, change it, and return changes back to the client, which could
    // cause data loss if we were to auto-save the data model while the server is still processing the request.
    lockedBy: string | undefined;

    // This is the url to use when saving the data model to the server. This can also be used to uniquely identify
    // the data model, so that we can save multiple data models to the server at the same time.
    saveUrl: string;
  };
}

export interface FDChange {
  // Overrides the timeout before the change is applied to the debounced data model. If not set, the default
  // timeout is used. The debouncing may also happen sooner than you think, if the user continues typing in
  // a form field that has a lower timeout. This is because the debouncing is global, not per field.
  debounceTimeout?: number;
}

export interface FDNewValue extends FDChange {
  path: string;
  newValue: FDLeafValue;
}

export interface FDNewValues extends FDChange {
  changes: FDNewValue[];
}

export interface FDAppendToListUnique {
  path: string;
  newValue: any;
}

export interface FDAppendToList {
  path: string;
  newValue: any;
}

export interface FDRemoveIndexFromList {
  path: string;
  index: number;
}

export interface FDRemoveValueFromList {
  path: string;
  value: any;
}

export interface FDSaveFinished {
  patch?: JsonPatch;
  savedData: object;
  newDataModel: object;
  validationIssues: BackendValidationIssueGroups | undefined;
}

export interface FormDataMethods {
  // Methods used for updating the data model. These methods will update the currentData model, and after
  // the debounce() method is called, the debouncedCurrentData model will be updated as well.
  setLeafValue: (change: FDNewValue) => void;
  setMultiLeafValues: (changes: FDNewValues) => void;
  appendToListUnique: (change: FDAppendToListUnique) => void;
  appendToList: (change: FDAppendToList) => void;
  removeIndexFromList: (change: FDRemoveIndexFromList) => void;
  removeValueFromList: (change: FDRemoveValueFromList) => void;

  // Internal utility methods
  debounce: () => void;
  saveStarted: () => void;
  cancelSave: () => void;
  saveFinished: (props: FDSaveFinished) => void;
  requestManualSave: (setTo?: boolean) => void;
  lock: (lockName: string) => void;
  unlock: (newModel?: object) => void;
}

export type FormDataContext = FormDataState & FormDataMethods;

function makeActions(
  set: (fn: (state: FormDataContext) => void) => void,
  ruleConnections: IRuleConnections | null,
  schemaLookup: SchemaLookupTool,
): FormDataMethods {
  function setDebounceTimeout(state: FormDataContext, change: FDChange) {
    state.controlState.debounceTimeout = change.debounceTimeout ?? DEFAULT_DEBOUNCE_TIMEOUT;
  }

  function processChanges(
    state: FormDataContext,
    { newDataModel, savedData }: Pick<FDSaveFinished, 'newDataModel' | 'patch' | 'savedData'>,
  ) {
    if (newDataModel) {
      const backendChangesPatch = createPatch({ prev: savedData, next: newDataModel, current: state.currentData });
      applyPatch(state.currentData, backendChangesPatch);
      state.lastSavedData = structuredClone(newDataModel);

      // Run rules again, against current data. Now that we have updates from the backend, some rules may
      // have caused data to change.
      const ruleResults = runLegacyRules(ruleConnections, savedData, state.currentData);
      for (const { path, newValue } of ruleResults) {
        dot.str(path, newValue, state.currentData);
      }
    } else {
      state.lastSavedData = structuredClone(savedData);
    }
    state.hasUnsavedChanges = !deepEqual(state.currentData, state.lastSavedData);
  }

  function debounce(state: FormDataContext) {
    if (deepEqual(state.debouncedCurrentData, state.currentData)) {
      state.hasUnsavedChanges = !deepEqual(state.currentData, state.lastSavedData);
      state.debouncedCurrentData = state.currentData;
      return;
    }

    const ruleChanges = runLegacyRules(ruleConnections, state.debouncedCurrentData, state.currentData);
    for (const { path, newValue } of ruleChanges) {
      dot.str(path, newValue, state.currentData);
    }

    state.debouncedCurrentData = state.currentData;
    state.hasUnsavedChanges = !deepEqual(state.debouncedCurrentData, state.lastSavedData);
  }

  function setValue(props: { path: string; newValue: FDLeafValue; state: FormDataState & FormDataMethods }) {
    const { path, newValue, state } = props;
    if (newValue === '' || newValue === null || newValue === undefined) {
      dot.delete(path, state.currentData);
    } else {
      const schema = schemaLookup.getSchemaForPath(path)[0];
      const { newValue: convertedValue, error } = convertData(newValue, schema);
      if (error) {
        dot.delete(path, state.currentData);
        dot.str(path, newValue, state.invalidCurrentData);
      } else {
        dot.delete(path, state.invalidCurrentData);
        dot.str(path, convertedValue, state.currentData);
      }
    }
  }

  return {
    debounce: () =>
      set((state) => {
        debounce(state);
      }),

    saveStarted: () =>
      set((state) => {
        state.controlState.isSaving = true;
      }),
    cancelSave: () =>
      set((state) => {
        state.controlState.isSaving = false;
      }),
    saveFinished: (props) =>
      set((state) => {
        const { validationIssues } = props;
        state.controlState.manualSaveRequested = false;
        state.validationIssues = validationIssues;
        state.controlState.isSaving = false;
        processChanges(state, props);
      }),
    setLeafValue: ({ path, newValue, ...rest }) =>
      set((state) => {
        const existingValue = dot.pick(path, state.currentData);
        if (existingValue === newValue) {
          return;
        }

        state.hasUnsavedChanges = true;
        setDebounceTimeout(state, rest);
        setValue({ newValue, path, state });
      }),

    // All the list methods perform their work immediately, without debouncing, so that UI updates for new/removed
    // list items are immediate.
    appendToListUnique: ({ path, newValue }) =>
      set((state) => {
        for (const model of [state.currentData, state.debouncedCurrentData]) {
          const existingValue = dot.pick(path, model);
          if (Array.isArray(existingValue) && existingValue.includes(newValue)) {
            continue;
          }

          state.hasUnsavedChanges = true;
          if (Array.isArray(existingValue)) {
            existingValue.push(newValue);
          } else {
            dot.str(path, [newValue], model);
          }
        }
      }),
    appendToList: ({ path, newValue }) =>
      set((state) => {
        for (const model of [state.currentData, state.debouncedCurrentData]) {
          const existingValue = dot.pick(path, model);
          state.hasUnsavedChanges = true;
          if (Array.isArray(existingValue)) {
            existingValue.push(newValue);
          } else {
            dot.str(path, [newValue], model);
          }
        }
      }),
    removeIndexFromList: ({ path, index }) =>
      set((state) => {
        for (const model of [state.currentData, state.debouncedCurrentData]) {
          const existingValue = dot.pick(path, model);
          if (index >= existingValue.length) {
            continue;
          }

          state.hasUnsavedChanges = true;
          existingValue.splice(index, 1);
        }
      }),
    removeValueFromList: ({ path, value }) =>
      set((state) => {
        for (const model of [state.currentData, state.debouncedCurrentData]) {
          const existingValue = dot.pick(path, model);
          if (!existingValue.includes(value)) {
            continue;
          }

          state.hasUnsavedChanges = true;
          existingValue.splice(existingValue.indexOf(value), 1);
        }
      }),

    setMultiLeafValues: ({ changes, ...rest }) =>
      set((state) => {
        let changesFound = false;
        for (const { path, newValue } of changes) {
          const existingValue = dot.pick(path, state.currentData);
          if (existingValue === newValue) {
            continue;
          }
          setValue({ newValue, path, state });
          changesFound = true;
        }
        if (changesFound) {
          setDebounceTimeout(state, rest);
          state.hasUnsavedChanges = true;
        }
      }),
    requestManualSave: (setTo = true) =>
      set((state) => {
        state.controlState.manualSaveRequested = setTo;
        debounce(state);
      }),
    lock: (lockName) =>
      set((state) => {
        state.controlState.lockedBy = lockName;
      }),
    unlock: (newDataModel) =>
      set((state) => {
        state.controlState.lockedBy = undefined;
        if (newDataModel) {
          processChanges(state, { newDataModel, savedData: state.lastSavedData });
        }
      }),
  };
}

export const createFormDataWriteStore = (
  url: string,
  initialData: object,
  autoSaving: boolean,
  proxies: FormDataWriteProxies,
  ruleConnections: IRuleConnections | null,
  schemaLookup: SchemaLookupTool,
) =>
  createStore<FormDataContext>()(
    immer((set) => {
      const actions = makeActions(set, ruleConnections, schemaLookup);
      for (const name of Object.keys(actions)) {
        const fnName = name as keyof FormDataMethods;
        const original = actions[fnName];
        const proxyFn = proxies[fnName] as Proxy<keyof FormDataMethods>;
        const { proxy, method } = proxyFn(original);
        actions[fnName] = (...args: any[]) => {
          proxy({ args: args as any, toCall: method });
        };
      }

      return {
        currentData: initialData,
        invalidCurrentData: {},
        debouncedCurrentData: initialData,
        lastSavedData: initialData,
        hasUnsavedChanges: false,
        validationIssues: undefined,
        controlState: {
          autoSaving,
          isSaving: false,
          manualSaveRequested: false,
          lockedBy: undefined,
          debounceTimeout: DEFAULT_DEBOUNCE_TIMEOUT,
          saveUrl: url,
        },
        ...actions,
      };
    }),
  );
