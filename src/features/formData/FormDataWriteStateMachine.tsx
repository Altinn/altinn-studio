import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';
import { applyPatch } from 'fast-json-patch';
import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { convertData } from 'src/features/formData/convertData';
import { createPatch } from 'src/features/formData/jsonPatch/createPatch';
import { runLegacyRules } from 'src/features/formData/LegacyRules';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import type { SchemaLookupTool } from 'src/features/datamodel/useDataModelSchemaQuery';
import type { IRuleConnections } from 'src/features/form/dynamics';
import type { FDLeafValue } from 'src/features/formData/FormDataWrite';
import type { FormDataWriteProxies, Proxy } from 'src/features/formData/FormDataWriteProxies';
import type { BackendValidationIssueGroups } from 'src/features/validation';
import type { IDataModelReference } from 'src/layout/common.generated';

export interface DataModelState {
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

  // This identifies the specific data element in storage. This is needed for identifying the correct model when receiving updates from the server.
  // For stateless apps, this will be null.
  dataElementId: string | null;

  // Whether this data model can be written to or not
  readonly: boolean;

  // Whether this data model is the default data model (from layout sets)
  isDefault: boolean;
}

type FormDataState = {
  // Data model state
  dataModels: { [dataType: string]: DataModelState };

  // Auto-saving is turned on by default, and will automatically save the data model to the server whenever the
  // debouncedCurrentData model changes. This can be turned off when, for example, you want to save the data model
  // only when the user navigates to another page.
  autoSaving: boolean;

  // The time in milliseconds to debounce the currentData model. This is used to determine how long to wait after the
  // user has stopped typing before updating that data into the debouncedCurrentData model. Usually this will follow
  // the default value, it can also be changed at any time by each component that uses the FormDataWriter.
  debounceTimeout: number;

  // This is used to track whether the user has requested a manual save. When auto-saving is turned off, this is
  // the way we track when to save the data model to the server. It can also be used to trigger a manual save
  // as a way to immediately save the data model to the server, for example before locking the data model.
  manualSaveRequested: boolean;

  // This contains the validation issues we receive from the server last time we saved the data model.
  validationIssues: BackendValidationIssueGroups | undefined;

  // This may contain a callback function that will be called whenever the save finishes.
  // Should only be set from NodesContext.
  onSaveFinished: (() => void) | undefined;
  setOnSaveFinished: (callback: () => void) => void;

  // This is used to track which component is currently blocking the auto-saving feature. If this is set to a string
  // value, auto-saving will be disabled, even if the autoSaving flag is set to true. This is useful when you want
  // to temporarily disable auto-saving, for example when clicking a CustomButton and waiting for the server to
  // respond. The server might read the data model, change it, and return changes back to the client, which could
  // cause data loss if we were to auto-save the data model while the server is still processing the request.
  lockedBy: string | undefined;
};

export interface FDChange {
  // Overrides the timeout before the change is applied to the debounced data model. If not set, the default
  // timeout is used. The debouncing may also happen sooner than you think, if the user continues typing in
  // a form field that has a lower timeout. This is because the debouncing is global, not per field.
  debounceTimeout?: number;
}

export interface FDNewValue extends FDChange {
  reference: IDataModelReference;
  newValue: FDLeafValue;
}

export interface FDNewValues extends FDChange {
  changes: FDNewValue[];
}

export interface FDAppendToListUnique {
  reference: IDataModelReference;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue: any;
}

export interface FDAppendToList {
  reference: IDataModelReference;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue: any;
}

export interface FDRemoveIndexFromList {
  reference: IDataModelReference;
  index: number;
}

export interface FDRemoveValueFromList {
  reference: IDataModelReference;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export interface FDRemoveFromListCallback {
  reference: IDataModelReference;
  startAtIndex?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (value: any) => boolean;
}

export interface UpdatedDataModel {
  data: unknown;
  dataType: string;
  dataElementId: string | undefined; // Can be undefined in stateless apps
}

export interface FDSaveResult {
  newDataModels: UpdatedDataModel[];
  validationIssues: BackendValidationIssueGroups | undefined;
}

export interface FDActionResult {
  updatedDataModels:
    | {
        [dataElementId: string]: object;
      }
    | undefined;
  updatedValidationIssues: BackendValidationIssueGroups | undefined;
}

export interface FDSaveFinished extends FDSaveResult {
  savedData: {
    [dataType: string]: object;
  };
}

interface ToProcess {
  savedData: FDSaveFinished['savedData'];
  newDataModels: UpdatedDataModel[];
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
  unlock: (saveResult?: FDActionResult) => void;
}

export type FormDataContext = FormDataState & FormDataMethods;

function makeActions(
  set: (fn: (state: FormDataContext) => void) => void,
  ruleConnections: IRuleConnections | null,
  schemaLookup: { [dataType: string]: SchemaLookupTool },
): FormDataMethods {
  function setDebounceTimeout(state: FormDataContext, change: FDChange) {
    state.debounceTimeout = change.debounceTimeout ?? DEFAULT_DEBOUNCE_TIMEOUT;
  }

  /**
   * Deduplicate the current data model and the debounced data model. This is used to prevent unnecessary
   * copies of the data model when the content inside them is the same. We do this when debouncing and saving,
   * as deepEqual is a fairly expensive operation, and the object references has to be the same for hasUnsavedChanges
   * to work properly.
   */
  function deduplicateModels(state: FormDataContext) {
    for (const [dataType, { currentData, debouncedCurrentData, lastSavedData }] of Object.entries(state.dataModels)) {
      const models = [
        { key: 'currentData', model: currentData },
        { key: 'debouncedCurrentData', model: debouncedCurrentData },
        { key: 'lastSavedData', model: lastSavedData },
      ];

      const currentIsDebounced = currentData === debouncedCurrentData;
      const currentIsSaved = currentData === lastSavedData;
      const debouncedIsSaved = debouncedCurrentData === lastSavedData;
      if (currentIsDebounced && currentIsSaved && debouncedIsSaved) {
        return;
      }

      for (const modelA of models) {
        for (const modelB of models) {
          if (modelA.model === modelB.model) {
            continue;
          }
          if (deepEqual(modelA.model, modelB.model)) {
            state.dataModels[dataType][modelB.key] = modelA.model;
            modelB.model = modelA.model;
          }
        }
      }
    }
  }

  function processChanges(state: FormDataContext, { newDataModels, savedData }: ToProcess) {
    state.manualSaveRequested = false;
    for (const [dataType, { dataElementId, isDefault }] of Object.entries(state.dataModels)) {
      const next = dataElementId
        ? newDataModels.find((m) => m.dataElementId === dataElementId)?.data // Stateful apps
        : newDataModels.find((m) => m.dataType === dataType)?.data; // Stateless apps
      if (next) {
        const backendChangesPatch = createPatch({
          prev: savedData[dataType],
          next,
          current: state.dataModels[dataType].currentData,
        });
        applyPatch(state.dataModels[dataType].currentData, backendChangesPatch);
        state.dataModels[dataType].lastSavedData = next;

        // Run rules again, against current data. Now that we have updates from the backend, some rules may
        // have caused data to change.
        if (isDefault) {
          const ruleResults = runLegacyRules(
            ruleConnections,
            savedData[dataType],
            state.dataModels[dataType].currentData,
            dataType,
          );
          for (const { reference, newValue } of ruleResults) {
            dot.str(reference.field, newValue, state.dataModels[dataType].currentData);
          }
        }
      } else {
        state.dataModels[dataType].lastSavedData = savedData[dataType];
      }
    }
    deduplicateModels(state);
  }

  function debounce(state: FormDataContext) {
    for (const [dataType, { isDefault }] of Object.entries(state.dataModels)) {
      state.dataModels[dataType].invalidDebouncedCurrentData = state.dataModels[dataType].invalidCurrentData;
      if (deepEqual(state.dataModels[dataType].debouncedCurrentData, state.dataModels[dataType].currentData)) {
        state.dataModels[dataType].debouncedCurrentData = state.dataModels[dataType].currentData;
        continue;
      }

      if (isDefault) {
        const ruleChanges = runLegacyRules(
          ruleConnections,
          state.dataModels[dataType].debouncedCurrentData,
          state.dataModels[dataType].currentData,
          dataType,
        );
        for (const { reference, newValue } of ruleChanges) {
          dot.str(reference.field, newValue, state.dataModels[dataType].currentData);
        }
      }

      state.dataModels[dataType].debouncedCurrentData = state.dataModels[dataType].currentData;
    }
  }

  function setValue(props: { reference: IDataModelReference; newValue: FDLeafValue; state: FormDataContext }) {
    const { reference, newValue, state } = props;
    if (newValue === '' || newValue === null || newValue === undefined) {
      const prevValue = dot.pick(reference.field, state.dataModels[reference.dataType].currentData);

      // We conflate null and undefined, so no need to set to null or undefined if the value is
      // already null or undefined
      if (prevValue !== null && prevValue !== undefined) {
        dot.delete(reference.field, state.dataModels[reference.dataType].currentData);
        dot.delete(reference.field, state.dataModels[reference.dataType].invalidCurrentData);
      }
    } else {
      const schema = schemaLookup[reference.dataType].getSchemaForPath(reference.field)[0];
      const { newValue: convertedValue, error } = convertData(newValue, schema);
      if (error) {
        dot.delete(reference.field, state.dataModels[reference.dataType].currentData);
        dot.str(reference.field, newValue, state.dataModels[reference.dataType].invalidCurrentData);
      } else {
        dot.delete(reference.field, state.dataModels[reference.dataType].invalidCurrentData);
        dot.str(reference.field, convertedValue, state.dataModels[reference.dataType].currentData);
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
        state.manualSaveRequested = false;
        deduplicateModels(state);
      }),
    saveFinished: (props) =>
      set((state) => {
        const { validationIssues } = props;
        state.validationIssues = validationIssues;
        processChanges(state, props);
      }),
    setLeafValue: ({ reference, newValue, ...rest }) =>
      set((state) => {
        if (state.dataModels[reference.dataType].readonly) {
          window.logError(`Tried to write to readOnly dataType "${reference.dataType}"`);
          return;
        }
        const existingValue = dot.pick(reference.field, state.dataModels[reference.dataType].currentData);
        if (existingValue === newValue) {
          return;
        }

        setDebounceTimeout(state, rest);
        setValue({ newValue, reference, state });
      }),

    // All the list methods perform their work immediately, without debouncing, so that UI updates for new/removed
    // list items are immediate.
    appendToListUnique: ({ reference, newValue }) =>
      set((state) => {
        if (state.dataModels[reference.dataType].readonly) {
          window.logError(`Tried to write to readOnly dataType "${reference.dataType}"`);
          return;
        }
        const existingValue = dot.pick(reference.field, state.dataModels[reference.dataType].currentData);
        if (Array.isArray(existingValue) && existingValue.includes(newValue)) {
          return;
        }

        if (Array.isArray(existingValue)) {
          existingValue.push(newValue);
        } else {
          dot.str(reference.field, [newValue], state.dataModels[reference.dataType].currentData);
        }
      }),
    appendToList: ({ reference, newValue }) =>
      set((state) => {
        if (state.dataModels[reference.dataType].readonly) {
          window.logError(`Tried to write to readOnly dataType "${reference.dataType}"`);
          return;
        }
        const existingValue = dot.pick(reference.field, state.dataModels[reference.dataType].currentData);

        if (Array.isArray(existingValue)) {
          existingValue.push(newValue);
        } else {
          dot.str(reference.field, [newValue], state.dataModels[reference.dataType].currentData);
        }
      }),
    removeIndexFromList: ({ reference, index }) =>
      set((state) => {
        if (state.dataModels[reference.dataType].readonly) {
          window.logError(`Tried to write to readOnly dataType "${reference.dataType}"`);
          return;
        }
        const existingValue = dot.pick(reference.field, state.dataModels[reference.dataType].currentData);
        if (index >= existingValue.length) {
          return;
        }

        existingValue.splice(index, 1);
      }),
    removeValueFromList: ({ reference, value }) =>
      set((state) => {
        if (state.dataModels[reference.dataType].readonly) {
          window.logError(`Tried to write to readOnly dataType "${reference.dataType}"`);
          return;
        }
        const existingValue = dot.pick(reference.field, state.dataModels[reference.dataType].currentData);
        if (!existingValue.includes(value)) {
          return;
        }

        existingValue.splice(existingValue.indexOf(value), 1);
      }),
    removeFromListCallback: ({ reference, startAtIndex, callback }) =>
      set((state) => {
        if (state.dataModels[reference.dataType].readonly) {
          window.logError(`Tried to write to readOnly dataType "${reference.dataType}"`);
          return;
        }
        const existingValue = dot.pick(reference.field, state.dataModels[reference.dataType].currentData);
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
        const changedTypes = new Set<string>();
        for (const { reference, newValue } of changes) {
          if (state.dataModels[reference.dataType].readonly) {
            window.logError(`Tried to write to readOnly dataType "${reference.dataType}"`);
            continue;
          }

          const existingValue = dot.pick(reference.field, state.dataModels[reference.dataType].currentData);
          if (existingValue === newValue) {
            continue;
          }
          setValue({ newValue, reference, state });
          changedTypes.add(reference.dataType);
        }
        setDebounceTimeout(state, rest);
      }),
    requestManualSave: (setTo = true) =>
      set((state) => {
        state.manualSaveRequested = setTo;
      }),
    lock: (lockName) =>
      set((state) => {
        state.lockedBy = lockName;
      }),
    unlock: (actionResult) =>
      set((state) => {
        state.lockedBy = undefined;
        // Update form data
        if (actionResult?.updatedDataModels) {
          const newDataModels: UpdatedDataModel[] = [];
          for (const dataElementId of Object.keys(actionResult.updatedDataModels)) {
            const dataType = Object.keys(state.dataModels).find(
              (dt) => state.dataModels[dt].dataElementId === dataElementId,
            );
            if (dataType) {
              const data = actionResult.updatedDataModels[dataElementId];
              newDataModels.push({ data, dataType, dataElementId });
            }
          }

          processChanges(state, {
            newDataModels,
            savedData: Object.entries(state.dataModels).reduce((savedData, [dataType, { lastSavedData }]) => {
              savedData[dataType] = lastSavedData;
              return savedData;
            }, {}),
          });
        }
        // Update validation issues
        if (actionResult?.updatedValidationIssues) {
          state.validationIssues = actionResult.updatedValidationIssues;
        }
      }),
  };
}

export const createFormDataWriteStore = (
  initialDataModels: { [dataType: string]: DataModelState },
  autoSaving: boolean,
  proxies: FormDataWriteProxies,
  ruleConnections: IRuleConnections | null,
  schemaLookup: { [dataType: string]: SchemaLookupTool },
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

      return {
        dataModels: initialDataModels,
        autoSaving,
        lockedBy: undefined,
        debounceTimeout: DEFAULT_DEBOUNCE_TIMEOUT,
        manualSaveRequested: false,
        validationIssues: undefined,
        onSaveFinished: undefined,
        setOnSaveFinished: (callback) =>
          set((state) => {
            state.onSaveFinished = callback;
          }),
        ...actions,
      };
    }),
  );
