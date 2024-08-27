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

  // This is a partial object containing potential invalid data, In the currentData object, these values will be
  // missing/undefined. The point of these values is for the data model to _seem like_ it can store anything, even
  // though some values are simply not valid according to the JsonSchema we need to follow. This is useful for example
  // when the user is typing a number, as the current model is updated for every keystroke, but if the user
  // types '-5', the model will be invalid until the user types the '5' as well. This way we can show the user the
  // value they are typing, as they are typing it, while also keeping it away from the data model until it is valid
  // to store in it.
  invalidCurrentData: object;

  // These values contain the current data model, with the values debounced at 400ms. This means that if the user is
  // typing, the values will be updated 400ms after the user stopped typing. Use these values when you need to perform
  // expensive operations on the data model, such as validation, calculations, or sending a request to save the model.
  debouncedCurrentData: object;

  // This is a debounced variant of the invalidCurrentData model. This is useful for example when you want to show
  // validation errors to the user, but you don't want to show them immediately as the user is typing. Instead,
  // should wait until the user has stopped typing for a while, and then show the validation errors based off of
  // this model.
  invalidDebouncedCurrentData: object;

  // These values contain the last saved data model, with the values that were last saved to the server. We use this
  // to determine if there are any unsaved changes, and to diff the current data model against the last saved data
  // model when saving. You probably don't need to use these values directly unless you know what you're doing.
  lastSavedData: object;

  // This contains the validation issues we receive from the server last time we saved the data model.
  validationIssues: BackendValidationIssueGroups | undefined;

  // This may contain a callback function that will be called whenever the save finishes.
  // Should only be set from NodesContext.
  onSaveFinished: (() => void) | undefined;
  setOnSaveFinished: (callback: () => void) => void;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue: any;
}

export interface FDAppendToList {
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue: any;
}

export interface FDRemoveIndexFromList {
  path: string;
  index: number;
}

export interface FDRemoveValueFromList {
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export interface FDRemoveFromListCallback {
  path: string;
  startAtIndex?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (value: any) => boolean;
}

export interface FDSaveResult {
  newDataModel: object;
  validationIssues: BackendValidationIssueGroups | undefined;
}

export interface FDSaveFinished extends FDSaveResult {
  patch?: JsonPatch;
  savedData: object;
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
  removeFromListCallback: (change: FDRemoveFromListCallback) => void;

  // Internal utility methods
  debounce: () => void;
  cancelSave: () => void;
  saveFinished: (props: FDSaveFinished) => void;
  requestManualSave: (setTo?: boolean) => void;
  lock: (lockName: string) => void;
  unlock: (saveResult?: FDSaveResult) => void;
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

  /**
   * Deduplicate the current data model and the debounced data model. This is used to prevent unnecessary
   * copies of the data model when the content inside them is the same. We do this when debouncing and saving,
   * as deepEqual is a fairly expensive operation, and the object references has to be the same for hasUnsavedChanges
   * to work properly.
   */
  function deduplicateModels(state: FormDataContext) {
    const models = [
      { key: 'currentData', model: state.currentData },
      { key: 'debouncedCurrentData', model: state.debouncedCurrentData },
      { key: 'lastSavedData', model: state.lastSavedData },
    ];

    const currentIsDebounced = state.currentData === state.debouncedCurrentData;
    const currentIsSaved = state.currentData === state.lastSavedData;
    const debouncedIsSaved = state.debouncedCurrentData === state.lastSavedData;
    if (currentIsDebounced && currentIsSaved && debouncedIsSaved) {
      return;
    }

    for (const modelA of models) {
      for (const modelB of models) {
        if (modelA.model === modelB.model) {
          continue;
        }
        if (deepEqual(modelA.model, modelB.model)) {
          state[modelB.key] = modelA.model;
          modelB.model = modelA.model;
        }
      }
    }
  }

  function processChanges(
    state: FormDataContext,
    { newDataModel, savedData }: Pick<FDSaveFinished, 'newDataModel' | 'patch' | 'savedData'>,
  ) {
    state.controlState.manualSaveRequested = false;
    if (newDataModel) {
      const backendChangesPatch = createPatch({ prev: savedData, next: newDataModel, current: state.currentData });
      applyPatch(state.currentData, backendChangesPatch);
      state.lastSavedData = newDataModel;

      // Run rules again, against current data. Now that we have updates from the backend, some rules may
      // have caused data to change.
      const ruleResults = runLegacyRules(ruleConnections, savedData, state.currentData);
      for (const { path, newValue } of ruleResults) {
        dot.str(path, newValue, state.currentData);
      }
    } else {
      state.lastSavedData = savedData;
    }
    deduplicateModels(state);
  }

  function debounce(state: FormDataContext) {
    state.invalidDebouncedCurrentData = state.invalidCurrentData;
    if (deepEqual(state.debouncedCurrentData, state.currentData)) {
      state.debouncedCurrentData = state.currentData;
      return;
    }

    const ruleChanges = runLegacyRules(ruleConnections, state.debouncedCurrentData, state.currentData);
    for (const { path, newValue } of ruleChanges) {
      dot.str(path, newValue, state.currentData);
    }

    state.debouncedCurrentData = state.currentData;
  }

  function setValue(props: { path: string; newValue: FDLeafValue; state: FormDataState & FormDataMethods }) {
    const { path, newValue, state } = props;
    if (newValue === '' || newValue === null || newValue === undefined) {
      const prevValue = dot.pick(path, state.currentData);

      // We conflate null and undefined, so no need to set to null or undefined if the value is
      // already null or undefined
      if (prevValue !== null && prevValue !== undefined) {
        dot.delete(path, state.currentData);
        dot.delete(path, state.invalidCurrentData);
      }
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
    cancelSave: () =>
      set((state) => {
        state.controlState.manualSaveRequested = false;
        deduplicateModels(state);
      }),
    saveFinished: (props) =>
      set((state) => {
        const { validationIssues } = props;
        state.validationIssues = validationIssues;
        processChanges(state, props);
      }),
    setLeafValue: ({ path, newValue, ...rest }) =>
      set((state) => {
        const existingValue = dot.pick(path, state.currentData);
        if (existingValue === newValue) {
          return;
        }

        setDebounceTimeout(state, rest);
        setValue({ newValue, path, state });
      }),

    // All the list methods perform their work immediately, without debouncing, so that UI updates for new/removed
    // list items are immediate.
    appendToListUnique: ({ path, newValue }) =>
      set((state) => {
        const existingValue = dot.pick(path, state.currentData);
        if (Array.isArray(existingValue) && existingValue.includes(newValue)) {
          return;
        }

        if (Array.isArray(existingValue)) {
          existingValue.push(newValue);
        } else {
          dot.str(path, [newValue], state.currentData);
        }
      }),
    appendToList: ({ path, newValue }) =>
      set((state) => {
        const existingValue = dot.pick(path, state.currentData);

        if (Array.isArray(existingValue)) {
          existingValue.push(newValue);
        } else {
          dot.str(path, [newValue], state.currentData);
        }
      }),
    removeIndexFromList: ({ path, index }) =>
      set((state) => {
        const existingValue = dot.pick(path, state.currentData);
        if (index >= existingValue.length) {
          return;
        }

        existingValue.splice(index, 1);
      }),
    removeValueFromList: ({ path, value }) =>
      set((state) => {
        const existingValue = dot.pick(path, state.currentData);
        if (!existingValue.includes(value)) {
          return;
        }

        existingValue.splice(existingValue.indexOf(value), 1);
      }),
    removeFromListCallback: ({ path, startAtIndex, callback }) =>
      set((state) => {
        const existingValue = dot.pick(path, state.currentData);
        if (!Array.isArray(existingValue)) {
          return;
        }

        if (
          startAtIndex !== undefined &&
          startAtIndex >= 0 &&
          startAtIndex < existingValue.length &&
          callback(existingValue[startAtIndex])
        ) {
          existingValue.splice(startAtIndex, 1);
          return;
        }

        // Continue looking for the item to remove from the start of the list if we didn't find it at the start index
        let index = 0;
        while (index < existingValue.length) {
          if (callback(existingValue[index])) {
            existingValue.splice(index, 1);
            return;
          }
          index++;
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
        }
      }),
    requestManualSave: (setTo = true) =>
      set((state) => {
        state.controlState.manualSaveRequested = setTo;
      }),
    lock: (lockName) =>
      set((state) => {
        state.controlState.lockedBy = lockName;
      }),
    unlock: (saveResult) =>
      set((state) => {
        state.controlState.lockedBy = undefined;
        if (saveResult?.newDataModel) {
          processChanges(state, { newDataModel: saveResult.newDataModel, savedData: state.lastSavedData });
        }
        if (saveResult?.validationIssues) {
          state.validationIssues = saveResult.validationIssues;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actions[fnName] = (...args: any[]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          proxy({ args: args as any, toCall: method });
        };
      }

      const emptyInvalidData = {};
      return {
        currentData: initialData,
        invalidCurrentData: emptyInvalidData,
        debouncedCurrentData: initialData,
        invalidDebouncedCurrentData: emptyInvalidData,
        lastSavedData: initialData,
        hasUnsavedChanges: false,
        validationIssues: undefined,
        onSaveFinished: undefined,
        setOnSaveFinished: (callback) =>
          set((state) => {
            state.onSaveFinished = callback;
          }),
        controlState: {
          autoSaving,
          manualSaveRequested: false,
          lockedBy: undefined,
          debounceTimeout: DEFAULT_DEBOUNCE_TIMEOUT,
          saveUrl: url,
        },
        ...actions,
      };
    }),
  );
