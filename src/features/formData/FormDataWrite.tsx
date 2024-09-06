import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useCurrentDataModelName, useGetDataModelUrl } from 'src/features/datamodel/useBindingSchema';
import { useRuleConnections } from 'src/features/form/dynamics/DynamicsContext';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useFormDataWriteProxies } from 'src/features/formData/FormDataWriteProxies';
import { createFormDataWriteStore } from 'src/features/formData/FormDataWriteStateMachine';
import { createPatch } from 'src/features/formData/jsonPatch/createPatch';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { getFormDataQueryKey } from 'src/features/formData/useFormDataQuery';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { type BackendValidationIssueGroups, IgnoredValidators } from 'src/features/validation';
import { useAsRef } from 'src/hooks/useAsRef';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { doPatchMultipleFormData } from 'src/queries/queries';
import { getMultiPatchUrl } from 'src/utils/urls/appUrlHelper';
import type { SchemaLookupTool } from 'src/features/datamodel/useDataModelSchemaQuery';
import type { IRuleConnections } from 'src/features/form/dynamics';
import type { FormDataWriteProxies } from 'src/features/formData/FormDataWriteProxies';
import type {
  DataModelState,
  FDActionResult,
  FDSaveFinished,
  FormDataContext,
  UpdatedDataModel,
} from 'src/features/formData/FormDataWriteStateMachine';
import type { FormDataRowsSelector, FormDataSelector } from 'src/layout';
import type { IDataModelReference, IMapping } from 'src/layout/common.generated';
import type { IDataModelBindings } from 'src/layout/layout';
import type { BaseRow } from 'src/utils/layout/types';

export type FDLeafValue = string | number | boolean | null | undefined | string[];
export type FDValue = FDLeafValue | object | FDValue[];

interface FormDataContextInitialProps {
  initialDataModels: { [dataType: string]: DataModelState };
  autoSaving: boolean;
  proxies: FormDataWriteProxies;
  ruleConnections: IRuleConnections | null;
  schemaLookup: { [dataType: string]: SchemaLookupTool };
}

const {
  Provider,
  useSelector,
  useMemoSelector,
  useSelectorAsRef,
  useLaxMemoSelector,
  useLaxDelayedSelector,
  useDelayedSelector,
  useLaxSelector,
  useLaxStore,
  useStore,
} = createZustandContext({
  name: 'FormDataWrite',
  required: true,
  initialCreateStore: ({
    initialDataModels,
    autoSaving,
    proxies,
    ruleConnections,
    schemaLookup,
  }: FormDataContextInitialProps) =>
    createFormDataWriteStore(initialDataModels, autoSaving, proxies, ruleConnections, schemaLookup),
});

function useFormDataSaveMutation() {
  const { doPatchFormData, doPostStatelessFormData } = useAppMutations();
  const getDataModelUrl = useGetDataModelUrl();
  const instanceId = useLaxInstance()?.instanceId;
  const multiPatchUrl = instanceId ? getMultiPatchUrl(instanceId) : undefined;
  const dataModelsRef = useAsRef(useSelector((state) => state.dataModels));
  const saveFinished = useSelector((s) => s.saveFinished);
  const cancelSave = useSelector((s) => s.cancelSave);
  const isStateless = useApplicationMetadata().isStatelessApp;
  const debounce = useSelector((s) => s.debounce);
  const waitFor = useWaitForState<
    { prev: { [dataType: string]: object }; next: { [dataType: string]: object } },
    FormDataContext
  >(useStore());
  const useIsSavingRef = useAsRef(useIsSaving());
  const onSaveFinishedRef = useSelectorAsRef((s) => s.onSaveFinished);
  const queryClient = useQueryClient();

  // This updates the query cache with the new data models every time a save has finished. This means we won't have to
  // refetch the data from the backend if the providers suddenly change (i.e. when navigating back and forth between
  // the main form and a subform).
  function updateQueryCache(result: FDSaveFinished) {
    for (const { dataType, data, dataElementId } of result.newDataModels) {
      const url = getDataModelUrl({ dataType, dataElementId, includeRowIds: true });
      if (!url) {
        continue;
      }
      const queryKey = getFormDataQueryKey(url);
      queryClient.setQueryData(queryKey, data);
    }
  }

  const mutation = useMutation({
    mutationKey: ['saveFormData'],
    mutationFn: async (): Promise<FDSaveFinished | undefined> => {
      // While we could get the next model from a ref, we want to make sure we get the latest model after debounce
      // at the moment we're saving. This is especially important when automatically saving (and debouncing) when
      // navigating away from the form context.
      debounce();
      const { next, prev } = await waitFor((state, setReturnValue) => {
        if (!hasUnDebouncedCurrentChanges(state)) {
          setReturnValue({
            next: Object.entries(state.dataModels).reduce((next, [dataType, { debouncedCurrentData }]) => {
              next[dataType] = debouncedCurrentData;
              return next;
            }, {}),
            prev: Object.entries(state.dataModels).reduce((prev, [dataType, { lastSavedData }]) => {
              prev[dataType] = lastSavedData;
              return prev;
            }, {}),
          });
          return true;
        }
        return false;
      });

      if (deepEqual(prev, next)) {
        return;
      }

      if (isStateless) {
        // Stateless does not support multi patch, so we need to save each model independently
        const newDataModels: Promise<UpdatedDataModel>[] = [];

        for (const dataType of Object.keys(dataModelsRef.current)) {
          if (next[dataType] === prev[dataType]) {
            continue;
          }
          const url = getDataModelUrl({ dataType });
          if (!url) {
            throw new Error(`Cannot post data, url for dataType '${dataType}' could not be determined`);
          }
          newDataModels.push(
            doPostStatelessFormData(url, next[dataType]).then((newDataModel) => ({
              dataType,
              data: newDataModel,
              dataElementId: undefined,
            })),
          );
        }

        if (newDataModels.length === 0) {
          return;
        }

        onSaveFinishedRef.current?.();
        return { newDataModels: await Promise.all(newDataModels), savedData: next, validationIssues: undefined };
      } else {
        // Stateful needs to use either old patch or multi patch

        const dataTypes = Object.keys(dataModelsRef.current);
        const shouldUseMultiPatch = dataTypes.length > 1;
        if (shouldUseMultiPatch) {
          if (!multiPatchUrl) {
            throw new Error(`Cannot patch data, multipatch url could not be determined`);
          }

          const patches = dataTypes.reduce((patches, dataType) => {
            const { dataElementId, debouncedCurrentData, lastSavedData } = dataModelsRef.current[dataType];
            if (dataElementId && debouncedCurrentData !== lastSavedData) {
              const patch = createPatch({ prev: prev[dataType], next: next[dataType] });
              if (patch.length > 0) {
                patches[dataElementId] = patch;
              }
            }
            return patches;
          }, {});

          if (Object.keys(patches).length === 0) {
            return;
          }

          const { newDataModels, validationIssues } = await doPatchMultipleFormData(multiPatchUrl, {
            patches,
            // Ignore validations that require layout parsing in the backend which will slow down requests significantly
            ignoredValidators: IgnoredValidators,
          });

          const dataModelChanges: UpdatedDataModel[] = [];
          for (const dataElementId of Object.keys(newDataModels)) {
            const dataType = Object.keys(dataModelsRef.current).find(
              (dataType) => dataModelsRef.current[dataType].dataElementId === dataElementId,
            );
            if (dataType) {
              dataModelChanges.push({ dataType, data: newDataModels[dataElementId], dataElementId });
            }
          }

          onSaveFinishedRef.current?.();
          return { newDataModels: dataModelChanges, validationIssues, savedData: next };
        } else {
          const dataType = dataTypes[0];
          const patch = createPatch({ prev: prev[dataType], next: next[dataType] });
          if (patch.length === 0) {
            return;
          }

          const dataElementId = dataModelsRef.current[dataType].dataElementId;
          if (!dataElementId) {
            throw new Error(`Cannot patch data, dataElementId for dataType '${dataType}' could not be determined`);
          }
          const url = getDataModelUrl({ dataElementId });
          if (!url) {
            throw new Error(`Cannot patch data, url for dataType '${dataType}' could not be determined`);
          }
          const { newDataModel, validationIssues } = await doPatchFormData(url, {
            patch,
            // Ignore validations that require layout parsing in the backend which will slow down requests significantly
            ignoredValidators: IgnoredValidators,
          });
          onSaveFinishedRef.current?.();
          return {
            newDataModels: [{ dataType, data: newDataModel, dataElementId }],
            validationIssues,
            savedData: next,
          };
        }
      }
    },
    onError: () => {
      cancelSave();
    },
    onSuccess: (result) => {
      result && updateQueryCache(result);
      result && saveFinished(result);
      !result && cancelSave();
    },
  });

  // Check if save has already started before calling mutate
  const _mutate = mutation.mutate;
  const mutate: typeof mutation.mutate = useCallback(
    (...args) => !useIsSavingRef.current && _mutate(...args),
    [useIsSavingRef, _mutate],
  );

  return {
    ...mutation,
    mutate,
  };
}

function useIsSaving() {
  return (
    useIsMutating({
      mutationKey: ['saveFormData'],
    }) > 0
  );
}

export function FormDataWriteProvider({ children }: PropsWithChildren) {
  const proxies = useFormDataWriteProxies();
  const ruleConnections = useRuleConnections();
  const { allDataTypes, writableDataTypes, defaultDataType, initialData, schemaLookup, dataElementIds } =
    DataModels.useFullState();
  const autoSaveBehaviour = usePageSettings().autoSaveBehavior;

  if (!writableDataTypes || !allDataTypes) {
    throw new Error('FormDataWriteProvider failed because data types have not been loaded, see DataModelsProvider.');
  }

  const initialDataModels = allDataTypes.reduce((dm, dt) => {
    const emptyInvalidData = {};
    dm[dt] = {
      currentData: initialData[dt],
      invalidCurrentData: emptyInvalidData,
      debouncedCurrentData: initialData[dt],
      invalidDebouncedCurrentData: emptyInvalidData,
      lastSavedData: initialData[dt],
      hasUnsavedChanges: false,
      dataElementId: dataElementIds[dt],
      readonly: !writableDataTypes.includes(dt),
      isDefault: dt === defaultDataType,
    };
    return dm;
  }, {});

  return (
    <Provider
      initialDataModels={initialDataModels}
      autoSaving={!autoSaveBehaviour || autoSaveBehaviour === 'onChangeFormData'}
      proxies={proxies}
      ruleConnections={ruleConnections}
      schemaLookup={schemaLookup}
    >
      <FormDataEffects />
      {children}
    </Provider>
  );
}

function FormDataEffects() {
  const { autoSaving, lockedBy, debounceTimeout, manualSaveRequested } = useSelector((s) => s);
  const hasUnsavedChanges = useHasUnsavedChanges();
  const setUnsavedAttrTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { mutate: performSave, error } = useFormDataSaveMutation();
  const isSaving = useIsSaving();
  const debounce = useDebounceImmediately();
  const hasUnsavedChangesNow = useHasUnsavedChangesNow();

  // If errors occur, we want to throw them so that the user can see them, and they
  // can be handled by the error boundary.
  if (error) {
    throw error;
  }

  // Marking the document as having unsaved changes. The data attribute is used in tests, while the beforeunload
  // event is used to warn the user when they try to navigate away from the page with unsaved changes.
  useEffect(() => {
    clearTimeout(setUnsavedAttrTimeout.current);
    if (hasUnsavedChanges) {
      document.body.setAttribute('data-unsaved-changes', 'true');
    } else {
      setUnsavedAttrTimeout.current = setTimeout(() => {
        document.body.setAttribute('data-unsaved-changes', 'false');
        setUnsavedAttrTimeout.current = undefined;
      }, 10);
    }
    window.onbeforeunload = hasUnsavedChanges ? () => true : null;

    return () => {
      document.body.removeAttribute('data-unsaved-changes');
      window.onbeforeunload = null;
    };
  }, [hasUnsavedChanges]);

  // Debounce the data model when the user stops typing. This has the effect of triggering the useEffect below,
  // saving the data model to the backend. Freezing can also be triggered manually, when a manual save is requested.
  const shouldDebounce = useSelector(hasUnDebouncedChanges);
  useEffect(() => {
    const timer = shouldDebounce.hasChanges
      ? setTimeout(() => {
          debounce();
        }, debounceTimeout)
      : undefined;

    return () => clearTimeout(timer);
  }, [debounce, debounceTimeout, shouldDebounce]);

  // Save the data model when the data has been frozen/debounced, and we're ready
  const needsToSave = useSelector(hasDebouncedUnsavedChanges);
  const canSaveNow = !isSaving && !lockedBy;
  const shouldSave = (needsToSave && canSaveNow && autoSaving) || manualSaveRequested;

  useEffect(() => {
    shouldSave && performSave();
  }, [performSave, shouldSave]);

  // Always save unsaved changes when the user navigates away from the page and this component is unmounted.
  // We cannot put the current and last saved data in the dependency array, because that would cause the effect
  // to trigger when the user is typing, which is not what we want.
  useEffect(
    () => () => {
      if (hasUnsavedChangesNow()) {
        performSave();
      }
    },
    [hasUnsavedChangesNow, performSave],
  );

  // Sets the debounced data in the window object, so that Cypress tests can access it.
  useSelector((state) => {
    if (window.Cypress) {
      const formData: { [key: string]: unknown } = {};
      for (const [dataType, { debouncedCurrentData }] of Object.entries(state.dataModels)) {
        formData[dataType] = debouncedCurrentData;
      }

      window.CypressState = { ...window.CypressState, formData };
    }
  });

  return null;
}

const useRequestManualSave = () => {
  const requestSave = useLaxSelector((s) => s.requestManualSave);
  return useCallback(
    (setTo = true) => {
      if (requestSave !== ContextNotProvided) {
        requestSave(setTo);
      }
    },
    [requestSave],
  );
};

const useDebounceImmediately = () => {
  const debounce = useLaxSelector((s) => s.debounce);
  return useCallback(() => {
    if (debounce !== ContextNotProvided) {
      debounce();
    }
  }, [debounce]);
};

function hasDebouncedUnsavedChanges(state: FormDataContext) {
  return Object.values(state.dataModels).some(
    ({ debouncedCurrentData, lastSavedData }) => debouncedCurrentData !== lastSavedData,
  );
}

/**
 * Checks if we need to debounce. This returns a new object so that the useEffect where it is used gets rerun whenever FormDataEffects renders.
 * If it returned the boolean directly, it would not extend the timeout beyond the first time which causes the debounce timeout not to work as intendend.
 * This may not be an optimal solution, it would ideally cause a rerender whenever any of the items it checks changes with some sort of selector.
 */
function hasUnDebouncedChanges(state: FormDataContext) {
  return {
    hasChanges: Object.values(state.dataModels).some(
      ({ currentData, debouncedCurrentData, invalidCurrentData, invalidDebouncedCurrentData }) =>
        currentData !== debouncedCurrentData || invalidCurrentData !== invalidDebouncedCurrentData,
    ),
  };
}

function hasUnDebouncedCurrentChanges(state: FormDataContext) {
  return Object.values(state.dataModels).some(
    ({ currentData, debouncedCurrentData }) => currentData !== debouncedCurrentData,
  );
}

function hasUnsavedChanges(state: FormDataContext) {
  return Object.values(state.dataModels).some(
    ({ currentData, lastSavedData, debouncedCurrentData }) =>
      currentData !== lastSavedData || debouncedCurrentData !== lastSavedData,
  );
}

const useHasUnsavedChanges = () => {
  const isSaving = useIsSaving();
  const result = useLaxMemoSelector((state) => hasUnsavedChanges(state));
  if (result === ContextNotProvided) {
    return false;
  }
  return result || isSaving;
};

const useHasUnsavedChangesNow = () => {
  const store = useStore();
  const isSavingNow = useIsSavingNow();

  return useCallback(() => {
    if (hasUnsavedChanges(store.getState())) {
      return true;
    }

    return isSavingNow();
  }, [store, isSavingNow]);
};

const useIsSavingNow = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    const numRequests = queryClient.getMutationCache().findAll({
      status: 'pending',
      mutationKey: ['saveFormData'],
    }).length;

    return numRequests > 0;
  }, [queryClient]);
};

const useWaitForSave = () => {
  const requestSave = useRequestManualSave();
  const dataTypes = useLaxMemoSelector((s) => Object.keys(s.dataModels));
  const waitFor = useWaitForState<
    BackendValidationIssueGroups | undefined,
    FormDataContext | typeof ContextNotProvided
  >(useLaxStore());

  return useCallback(
    async (requestManualSave = false): Promise<BackendValidationIssueGroups | undefined> => {
      if (dataTypes === ContextNotProvided) {
        return Promise.resolve(undefined);
      }

      if (requestManualSave) {
        requestSave();
      }

      return await waitFor((state, setReturnValue) => {
        if (state === ContextNotProvided) {
          setReturnValue(undefined);
          return true;
        }

        if (hasUnsavedChanges(state)) {
          return false;
        }

        setReturnValue(state.validationIssues);
        return true;
      });
    },
    [requestSave, dataTypes, waitFor],
  );
};

const emptyObject = {};
const emptyArray = [];

const debouncedSelector = (reference: IDataModelReference) => (state: FormDataContext) =>
  dot.pick(reference.field, state.dataModels[reference.dataType].debouncedCurrentData);
const invalidDebouncedSelector = (reference: IDataModelReference) => (state: FormDataContext) =>
  dot.pick(reference.field, state.dataModels[reference.dataType].invalidDebouncedCurrentData);

export const FD = {
  /**
   * Gives you a selector function that can be used to look up paths in the data model. This is similar to
   * useDebounced(), but it will only re-render the component if the value at the path(s) you selected actually
   * changes. This is useful if you want to avoid re-rendering when the form data changes, but you still want to
   * pretend to have the full data model available to look up values from.
   */
  useDebouncedSelector(): FormDataSelector {
    return useDelayedSelector({
      mode: 'simple',
      selector: debouncedSelector,
    });
  },

  /**
   * The same as useDebouncedSelector(), but will return BaseRow[] instead of the raw data. This is useful if you
   * just want to fetch the number of rows, and the indexes/uuids of those rows, without fetching the actual data
   * inside them (and re-render if that data changes).
   */
  useDebouncedRowsSelector(): FormDataRowsSelector {
    return useDelayedSelector({
      mode: 'simple',
      selector: (reference: IDataModelReference) => (state) => {
        const rawRows = dot.pick(reference.field, state.dataModels[reference.dataType].debouncedCurrentData);
        if (!Array.isArray(rawRows) || !rawRows.length) {
          return emptyArray;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rawRows.map((row: any, index: number) => ({ uuid: row[ALTINN_ROW_ID], index }));
      },
    });
  },

  /**
   * Same as useDebouncedSelector(), but for invalid data.
   */
  useInvalidDebouncedSelector(): FormDataSelector {
    return useDelayedSelector({
      mode: 'simple',
      selector: invalidDebouncedSelector,
    });
  },

  /**
   * This will return the form data as a deep object, just like the server sends it to us (and the way we send it back).
   * This will always give you the debounced data, which may or may not be saved to the backend yet.
   */
  useDebounced(dataType: string): object {
    return useSelector((v) => v.dataModels[dataType].debouncedCurrentData);
  },

  /**
   * This is the same as useDebouncedSelector(), but will return ContextNotProvided immediately if the context
   * provider is not present.
   */
  useLaxDebouncedSelector(): FormDataSelector | typeof ContextNotProvided {
    return useLaxDelayedSelector({
      mode: 'simple',
      selector: debouncedSelector,
    });
  },

  /**
   * This will pick a value from the form data, and return it. The path is expected to be a dot-separated path, and
   * the value will be returned as-is. If the value is not found, undefined is returned. Null may also be returned if
   * the value is explicitly set to null.
   */
  useDebouncedPick(reference: IDataModelReference): FDValue {
    return useSelector((v) => dot.pick(reference.field, v.dataModels[reference.dataType].debouncedCurrentData));
  },

  /**
   * This returns multiple values, as picked from the form data. The values in the input object is expected to be
   * dot-separated paths, and the return value will be an object with the same keys, but with the values picked
   * from the form data. If a value is not found, undefined is returned. Null may also be returned if the value
   * is explicitly set to null.
   */
  useFreshBindings: <T extends IDataModelBindings | undefined, O extends 'raw' | 'string'>(
    bindings: T,
    dataAs: O,
  ): T extends undefined ? Record<string, never> : { [key in keyof T]: O extends 'raw' ? FDValue : string } =>
    useMemoSelector((s) => {
      if (!bindings || Object.keys(bindings).length === 0) {
        return emptyObject;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out: any = {};
      for (const key of Object.keys(bindings)) {
        const field = bindings[key].field;
        const dataType = bindings[key].dataType;
        const invalidValue = dot.pick(field, s.dataModels[dataType].invalidCurrentData);
        if (invalidValue !== undefined) {
          out[key] = invalidValue;
          continue;
        }

        const value = dot.pick(field, s.dataModels[dataType].currentData);
        if (dataAs === 'raw') {
          out[key] = value;
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          out[key] = String(value);
        } else {
          out[key] = '';
        }
      }

      return out;
    }),

  /**
   * This returns multiple values, as picked from the form data. The values in the input object is expected to be
   * dot-separated paths, and the return value will be an object with the same keys, but with boolean values
   * indicating whether the current value is valid according to the schema or not. As an example, when typing '-5' into
   * a number field that maps to a number-typed property in the data model, the value will be invalid when the user
   * has only typed the '-' sign, but will be valid when the user has typed '-5'. We still store the invalid value
   * temporarily, so that the user can see what they have typed, but we don't send that value to the backend, even
   * when the user stops typing and the invalid value stays. This hook allows you to check whether the value is valid
   * and warn the user if it is not.
   */
  useBindingsAreValid: <T extends IDataModelBindings | undefined>(bindings: T): { [key in keyof T]: boolean } =>
    useMemoSelector((s) => {
      if (!bindings || Object.keys(bindings).length === 0) {
        return emptyObject;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out: any = {};
      for (const key of Object.keys(bindings)) {
        const field = bindings[key].field;
        const dataType = bindings[key].dataType;
        out[key] = dot.pick(field, s.dataModels[dataType].invalidCurrentData) === undefined;
      }
      return out;
    }),

  /**
   * This returns the current invalid data which cannot be saved to backend as an object. For example, this will
   * include data such as a stringy `-` in a number field (where presumably the user will type the rest of the number
   * later, such as `-5`). As this is the debounced data, it will only be updated when the user stops typing for a
   * while, so that this model can be used for i.e. validation messages.
   */
  useInvalidDebounced(dataType: string): object {
    return useSelector((v) => v.dataModels[dataType].invalidDebouncedCurrentData);
  },

  /**
   * This returns an object that can be used to generate a query string for parts of the current form data.
   * It is almost the same as usePickFreshStrings(), but with important differences:
   *   1. The _keys_ in the input are expected to contain the data model paths, not the values. Mappings are reversed
   *      in that sense.
   *   2. The data is fetched from the debounced model, not the fresh/current one. That ensures queries that are
   *      generated from this hook are more stable, and aren't re-fetched on every keystroke.
   */
  useMapping: <D extends 'string' | 'raw' = 'string'>(
    mapping: IMapping | undefined,
    dataAs?: D,
  ): D extends 'raw' ? { [key: string]: FDValue } : { [key: string]: string } => {
    const currentDataType = useCurrentDataModelName();
    return useMemoSelector((s) => {
      const realDataAs = dataAs || 'string';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out: any = {};
      if (mapping && currentDataType) {
        for (const key of Object.keys(mapping)) {
          const outputKey = mapping[key];
          const value = dot.pick(key, s.dataModels[currentDataType].debouncedCurrentData);

          if (realDataAs === 'raw') {
            out[outputKey] = value;
          } else if (typeof value === 'undefined' || value === null) {
            out[outputKey] = '';
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            out[outputKey] = String(value);
          } else {
            out[outputKey] = JSON.stringify(value);
          }
        }
      }
      return out;
    });
  },

  /**
   * This returns the raw method for setting a value in the form data. This is useful if you want to
   * set a value in the form data. This is probably too low-level for what you really want to do, so
   * consider using something like useDataModelBindings() instead.
   * @see useDataModelBindings
   */
  useSetLeafValue: () => useSelector((s) => s.setLeafValue),

  /**
   * This returns the raw method for setting multiple leaf values in the form data at once. This is
   * useful if you want to many values at the same time, atomically. This is probably too low-level
   * for what you really want to do, so consider using something like useDataModelBindings() instead.
   * @see useDataModelBindings
   */
  useSetMultiLeafValues: () => useSelector((s) => s.setMultiLeafValues),

  /**
   * The locking functionality allows you to prevent form data from saving, even if the user stops typing (or navigates
   * to the next page). This is useful if you want to perform a server-side action that requires the form data to be
   * in a certain state. Locking will effectively ignore all saving until you unlock it again.
   */
  useLocking(lockId: string) {
    const rawLock = useSelector((s) => s.lock);
    const rawUnlock = useSelector((s) => s.unlock);

    const lockedBy = useSelector((s) => s.lockedBy);
    const lockedByRef = useSelectorAsRef((s) => s.lockedBy);
    const isLocked = lockedBy !== undefined;
    const isLockedRef = useAsRef(isLocked);
    const isLockedByMe = lockedBy === lockId;
    const isLockedByMeRef = useAsRef(isLockedByMe);

    const hasUnsavedChangesNow = useHasUnsavedChangesNow();
    const waitForSave = useWaitForSave();

    const lock = useCallback(async () => {
      if (isLockedRef.current && !isLockedByMeRef.current) {
        window.logWarn(
          `Form data is already locked by ${lockedByRef.current}, cannot lock it again (requested by ${lockId})`,
        );
      }
      if (isLockedRef.current) {
        return false;
      }

      if (hasUnsavedChangesNow()) {
        await waitForSave(true);
      }

      rawLock(lockId);
      return true;
    }, [hasUnsavedChangesNow, isLockedByMeRef, isLockedRef, lockId, lockedByRef, rawLock, waitForSave]);

    const unlock = useCallback(
      (actionResult?: FDActionResult) => {
        if (!isLockedRef.current) {
          window.logWarn(`Form data is not locked, cannot unlock it (requested by ${lockId})`);
        }
        if (!isLockedByMeRef.current) {
          window.logWarn(`Form data is locked by ${lockedByRef.current}, cannot unlock it (requested by ${lockId})`);
        }
        if (!isLockedRef.current || !isLockedByMeRef.current) {
          return false;
        }

        rawUnlock(actionResult);
        return true;
      },
      [isLockedByMeRef, isLockedRef, lockId, lockedByRef, rawUnlock],
    );

    return useMemo(
      () => ({ lock, unlock, isLocked, lockedBy, isLockedByMe }),
      [isLocked, isLockedByMe, lock, lockedBy, unlock],
    );
  },

  /**
   * Returns a list of rows, given a binding/path that points to a repeating-group-like structure (i.e. an array of
   * objects). This will always be 'fresh', meaning it will update immediately when a new row is added/removed.
   */
  useFreshRows: (reference: IDataModelReference | undefined): BaseRow[] =>
    useMemoSelector((s) => {
      if (!reference) {
        return emptyArray;
      }

      const rawRows = dot.pick(reference.field, s.dataModels[reference.dataType].currentData);
      if (!Array.isArray(rawRows) || !rawRows.length) {
        return emptyArray;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rawRows.map((row: any, index: number) => ({ uuid: row[ALTINN_ROW_ID], index }));
    }),

  /**
   * Returns a function you can use to debounce saved form data
   * This will work (and return immediately) even if there is no FormDataWriteProvider in the tree.
   */
  useDebounceImmediately,

  /**
   * Returns a function you can use to wait until the form data is saved.
   * This will work (and return immediately) even if there is no FormDataWriteProvider in the tree.
   */
  useWaitForSave,

  /**
   * Returns a function you can use to request a manual save of the form data.
   */
  useRequestManualSave,

  /**
   * Returns true if the form data has unsaved changes
   * This will work (and return false) even if there is no FormDataWriteProvider in the tree.
   */
  useHasUnsavedChanges,

  /**
   * Same as the above, but returns a non-reactive function you can call to check if there are unsaved changes.
   */
  useHasUnsavedChangesNow,

  /**
   * Returns a function to append a value to a list. It checks if the value is already in the list, and if not,
   * it will append it. If the value is already in the list, it will not be appended.
   */
  useAppendToListUnique: () => useSelector((s) => s.appendToListUnique),

  /**
   * Returns a function to append a value to a list. It will always append the value, even if it is already in the list.
   */
  useAppendToList: () => useSelector((s) => s.appendToList),

  /**
   * Returns a function to remove a value from a list, by use of a callback that lets you find the correct row to
   * remove. When the callback returns true, that row will be removed.
   */
  useRemoveFromListCallback: () => useSelector((s) => s.removeFromListCallback),

  /**
   * Returns a function to remove a value from a list, by value. If your list contains unique values, this is the
   * safer alternative to useRemoveIndexFromList().
   */
  useRemoveValueFromList: () => useSelector((s) => s.removeValueFromList),

  /**
   * Returns the latest validation issues from the backend, from the last time the form data was saved.
   */
  useLastSaveValidationIssues: () => useSelector((s) => s.validationIssues),

  useGetDataTypeForElementId: () => {
    const map: Record<string, string | undefined> = useMemoSelector((s) =>
      Object.fromEntries(
        Object.entries(s.dataModels)
          .filter(([_, dataModel]) => dataModel.dataElementId)
          .map(([dataType, dataModel]) => [dataModel.dataElementId, dataType]),
      ),
    );

    return useCallback((dataElementId: string) => map[dataElementId], [map]);
  },

  /**
   * This lets you set to a function that will be called as soon as the saving operation finishes.
   * Beware that this is not a subscription service, so you can easily overwrite an existing callback here. This
   * is only meant to be used in NodesContext.
   */
  useSetOnSaveFinished: () => useSelector((s) => s.setOnSaveFinished),
};
