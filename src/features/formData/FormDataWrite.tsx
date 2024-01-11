/* eslint-disable no-console */
import React, { useCallback, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { useMutation } from '@tanstack/react-query';
import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useRuleConnections } from 'src/features/form/dynamics/DynamicsContext';
import { diffModels } from 'src/features/formData/diffModels';
import { useFormDataWriteProxies } from 'src/features/formData/FormDataWriteProxies';
import { createFormDataWriteStore } from 'src/features/formData/FormDataWriteStateMachine';
import { useAsRef } from 'src/hooks/useAsRef';
import { useIsDev } from 'src/hooks/useIsDev';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { flattenObject } from 'src/utils/databindings';
import { isAxiosError } from 'src/utils/isAxiosError';
import { useIsStatelessApp } from 'src/utils/useIsStatelessApp';
import type { IRuleConnections } from 'src/features/form/dynamics';
import type { FormDataWriteProxies } from 'src/features/formData/FormDataWriteProxies';
import type { FDNewValues, FormDataContext } from 'src/features/formData/FormDataWriteStateMachine';
import type { IFormData } from 'src/features/formData/index';
import type { SaveWhileTyping } from 'src/layout/common.generated';
import type { IDataModelBindings } from 'src/layout/layout';
import type { IDataAfterDataModelSave } from 'src/types/shared';

export type FDValue = string | number | boolean | object | undefined | null | FDValue[];

type SetLeafValueForBindings<B extends IDataModelBindings> = (key: keyof Exclude<B, undefined>, newValue: any) => void;
type SetMultiLeafValuesForBindings<B extends IDataModelBindings> = (
  changes: { binding: keyof Exclude<B, undefined>; newValue: any }[],
) => void;

interface MutationArg {
  dataModelUrl: string;
  newData: object;
  diff: Record<string, any>;
}

interface FormDataContextInitialProps {
  url: string;
  initialData: object;
  autoSaving: boolean;
  proxies: FormDataWriteProxies;
  ruleConnections: IRuleConnections | null;
}

const { Provider, useSelector, useLaxSelector } = createZustandContext({
  name: 'FormDataWrite',
  required: true,
  initialCreateStore: ({ url, initialData, autoSaving, proxies, ruleConnections }: FormDataContextInitialProps) =>
    createFormDataWriteStore(url, initialData, autoSaving, proxies, ruleConnections),
});

function createFormDataRequestFromDiff(modelToSave: object, diff: object, pretty?: boolean) {
  const data = new FormData();
  data.append('dataModel', JSON.stringify(modelToSave, undefined, pretty ? 2 : undefined));
  data.append('previousValues', JSON.stringify(diff, undefined, pretty ? 2 : undefined));
  return data;
}

const useFormDataSaveMutation = (ctx: FormDataContext) => {
  const { doPutFormData, doPostFormData } = useAppMutations();
  const { saveFinished } = ctx;
  const isDev = useIsDev();
  const isStateless = useIsStatelessApp();

  return useMutation({
    mutationKey: ['saveFormData'],
    mutationFn: async (arg: MutationArg) => {
      const { dataModelUrl, newData, diff } = arg;
      const data = createFormDataRequestFromDiff(newData, diff, isDev);
      try {
        if (isStateless) {
          const newModel = await doPostFormData.call(dataModelUrl, data);
          doPostFormData.setLastResult(newModel);
          saveFinished(newData, { newModel });
        } else {
          const metaData = await doPutFormData.call(dataModelUrl, data);
          doPutFormData.setLastResult(metaData);
          saveFinished(newData, { changedFields: metaData.changedFields });
        }
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 303) {
          // Fallback to old behavior if the server responds with 303 when there are changes. We handle these just
          // like we handle 200 responses.
          const data = error.response.data as IDataAfterDataModelSave;
          if (isStateless) {
            saveFinished(newData, { newModel: data });
          } else {
            saveFinished(newData, { changedFields: data.changedFields });
          }
          return;
        }
        throw error;
      }
    },
  });
};

interface FormDataWriterProps extends PropsWithChildren {
  url: string;
  initialData: object;
  autoSaving: boolean;
}

export function FormDataWriteProvider({ url, initialData, autoSaving, children }: FormDataWriterProps) {
  const proxies = useFormDataWriteProxies();
  const ruleConnections = useRuleConnections();

  return (
    <Provider
      url={url}
      autoSaving={autoSaving}
      proxies={proxies}
      initialData={initialData}
      ruleConnections={ruleConnections}
    >
      <FormDataEffects url={url} />
      {children}
    </Provider>
  );
}

function FormDataEffects({ url }: { url: string }) {
  const state = useSelector((s) => s);
  const { currentData, debouncedCurrentData, lastSavedData, controlState } = state;
  const { debounceTimeout, autoSaving, manualSaveRequested, lockedBy } = controlState;
  const { mutate, isLoading: isSaving, error } = useFormDataSaveMutation(state);
  const debounce = useDebounceImmediately();

  // This component re-renders on every keystroke in a form field. We don't want to save on every keystroke, nor
  // create a new performSave function after every save, so we use a ref to make sure the performSave function
  // and the unmount effect always have the latest values.
  const currentDataRef = useAsRef(currentData);
  const lastSavedDataRef = useAsRef(lastSavedData);
  const isSavingRef = useAsRef(isSaving);

  // If errors occur, we want to throw them so that the user can see them, and they
  // can be handled by the error boundary.
  if (error) {
    throw error;
  }

  const performSave = useCallback(
    (dataToSave: object) => {
      if (deepEqual(dataToSave, lastSavedDataRef.current) || isSavingRef.current) {
        return;
      }

      const toSaveFlat = flattenObject(dataToSave);
      const lastSavedDataFlat = flattenObject(lastSavedDataRef.current);
      const diff = diffModels(toSaveFlat, lastSavedDataFlat);

      mutate({
        dataModelUrl: url,
        newData: dataToSave,
        diff,
      });
    },
    [isSavingRef, lastSavedDataRef, mutate, url],
  );

  // Debounce the data model when the user stops typing. This has the effect of triggering the useEffect below,
  // saving the data model to the backend. Freezing can also be triggered manually, when a manual save is requested.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentData !== debouncedCurrentData) {
        debounce();
      }
    }, debounceTimeout);

    return () => clearTimeout(timer);
  }, [debounce, currentData, debouncedCurrentData, debounceTimeout]);

  // Save the data model when the data has been frozen to debouncedCurrentData and is different from the saved data
  useEffect(() => {
    const hasUnsavedDebouncedChanges =
      debouncedCurrentData !== lastSavedData && !deepEqual(debouncedCurrentData, lastSavedData);

    const shouldSave = hasUnsavedDebouncedChanges && !isSaving && !lockedBy;

    if (shouldSave && (autoSaving || manualSaveRequested)) {
      performSave(debouncedCurrentData);
    }
  }, [autoSaving, debouncedCurrentData, isSaving, lastSavedData, lockedBy, manualSaveRequested, performSave]);

  // Always save unsaved changes when the user navigates away from the page and this component is unmounted.
  // We cannot put the current and last saved data in the dependency array, because that would cause the effect
  // to trigger when the user is typing, which is not what we want.
  useEffect(
    () => () => {
      const hasUnsavedChanges =
        currentDataRef.current !== lastSavedDataRef.current &&
        !deepEqual(currentDataRef.current, lastSavedDataRef.current);
      if (hasUnsavedChanges) {
        performSave(currentDataRef.current);
      }
    },
    [currentDataRef, lastSavedDataRef, performSave],
  );

  // Sets the debounced data in the window object, so that Cypress tests can access it.
  useEffect(() => {
    if (window.Cypress) {
      window.CypressState = { ...window.CypressState, formData: debouncedCurrentData };
    }
  }, [debouncedCurrentData]);

  return null;
}

const useRequestManualSave = () => {
  const requestSave = useLaxSelector((s) => s.requestManualSave);
  return useCallback(
    (setTo?: boolean) => {
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

/**
 * TODO: This is being called from a lot of places now, and it should be optimized. Instead of calculating it
 * every time, we should probably store this in the zustand context.
 */
const useHasUnsavedChanges = () => {
  const result = useLaxSelector((s) => s.lastSavedData !== s.currentData && !deepEqual(s.lastSavedData, s.currentData));
  if (result === ContextNotProvided) {
    return false;
  }
  return result;
};

const useWaitForSave = () => {
  const requestSave = useRequestManualSave();
  const url = useLaxSelector((s) => s.controlState.saveUrl);
  const hasUnsavedChanges = useHasUnsavedChanges();
  const waitForUnsaved = useWaitForState(hasUnsavedChanges);

  return useCallback(
    (requestManualSave = false) => {
      if (url === ContextNotProvided) {
        return Promise.resolve();
      }

      if (requestManualSave) {
        requestSave();
      }

      return waitForUnsaved((hasUnsavedChanges) => !hasUnsavedChanges);
    },
    [requestSave, url, waitForUnsaved],
  );
};

export const FD = {
  /**
   * This will return the form data as a deep object, just like the server sends it to us (and the way we send it back).
   * This will always give you the debounced data, which may or may not be saved to the backend yet.
   */
  useDebounced(): object {
    return useSelector((v) => v.debouncedCurrentData);
  },

  /**
   * This will return the form data as a deep object, just like the server sends it to us (and the way we send it back).
   * This will always give you the latest data, which is always the data the backend has saved.
   */
  useLastSaved(): object {
    return useSelector((v) => v.lastSavedData);
  },

  /**
   * This will return the form data as a dot map, where the keys are dot-separated paths. This is the same format
   * as the older form data. Consider using any of the newer methods instead, which may come with performance benefits.
   * This will always give you the debounced (late) data, which may or may not be saved to the backend yet.
   */
  useDebouncedDotMap(): IFormData {
    const debouncedCurrentData = useSelector((v) => v.debouncedCurrentData);
    return useMemo(() => flattenObject(debouncedCurrentData), [debouncedCurrentData]);
  },

  /**
   * This returns a single value, as picked from the form data. The data is always converted to a string.
   * If the path points to a complex data type, like an object or array, an empty string is returned.
   * Use this when you expect a string/leaf value, and provide that to a controlled React component
   */
  usePickFreshString: (path: string | undefined): string => {
    const value = useSelector((v) => (path ? dot.pick(path, v.currentData) : undefined));
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value.toString() : '';
  },

  /**
   * This is like the one above, but for multiple values. The values in the input object is expected to be
   * dot-separated paths, and the return value will be an object with the same keys, but with the values picked
   * from the form data.
   */
  usePickFreshStrings: <B extends IDataModelBindings>(_bindings: B): { [key in keyof B]: string } => {
    const bindings = _bindings as any;
    return useSelector((s) => {
      const out: any = {};
      if (bindings) {
        for (const key of Object.keys(bindings)) {
          const value = dot.pick(bindings[key], s.currentData);
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            out[key] = value;
          } else {
            out[key] = '';
          }
        }
      }
      return out;
    });
  },

  /**
   * This returns a value, as picked from the form data. It may also return an array, object or null.
   * If you only expect a string/leaf value, use usePickString() instead.
   */
  usePickFreshAny: (path: string | undefined): FDValue =>
    useSelector((s) => (path ? dot.pick(path, s.currentData) : undefined)),

  /**
   * This returns multiple values, as picked from the form data. The values in the input object is expected to be
   * dot-separated paths, and the return value will be an object with the same keys, but with the values picked
   * from the form data. If a value is not found, undefined is returned. Null may also be returned if the value
   * is explicitly set to null.
   */
  useFreshBindings: <T extends IDataModelBindings | undefined>(
    bindings: T,
  ): T extends undefined ? Record<string, never> : { [key in keyof T]: FDValue } =>
    useSelector((s) => {
      const out: any = {};
      if (bindings) {
        for (const key of Object.keys(bindings)) {
          out[key] = dot.pick(bindings[key], s.currentData);
        }
      }

      return out;
    }),

  /**
   * This returns the raw method for setting a value in the form data. This is useful if you want to
   * set a value in the form data.
   */
  useSetLeafValue: () => useSelector((s) => s.setLeafValue),

  /**
   * Use this hook to get a function you can use to set a single value in the form data, using a binding.
   */
  useSetForBinding: (binding: string | undefined, saveWhileTyping?: SaveWhileTyping) => {
    const setLeafValue = useSelector((s) => s.setLeafValue);

    return useCallback(
      (newValue: any) => {
        if (!binding) {
          window.logWarn(`No data model binding found, silently ignoring request to save ${newValue}`);
          return;
        }
        setLeafValue({
          path: binding,
          newValue,
          debounceTimeout: typeof saveWhileTyping === 'number' ? saveWhileTyping : undefined,
        });
      },
      [binding, saveWhileTyping, setLeafValue],
    );
  },

  /**
   * Use this hook to get a function you can use to set multiple values in the form data, using a data model bindings
   * object.
   */
  useSetForBindings: <B extends IDataModelBindings>(
    bindings: B,
    saveWhileTyping?: SaveWhileTyping,
  ): SetLeafValueForBindings<B> => {
    const setLeafValue = useSelector((s) => s.setLeafValue);

    return useCallback(
      (key: keyof B, newValue: any) => {
        const binding = (bindings as any)[key];
        if (!binding) {
          const keyAsString = key as string;
          window.logWarn(
            `No data model binding found for ${keyAsString}, silently ignoring request to save ${newValue}`,
          );
          return;
        }
        setLeafValue({
          path: binding,
          newValue,
          debounceTimeout: typeof saveWhileTyping === 'number' ? saveWhileTyping : undefined,
        });
      },
      [bindings, saveWhileTyping, setLeafValue],
    );
  },

  /**
   * Use this hook to get a function you can use to set multiple values in the form data atomically, using a data model
   * bindings object.
   */
  useMultiSetForBindings: <B extends IDataModelBindings>(
    bindings: B,
    saveWhileTyping?: SaveWhileTyping,
  ): SetMultiLeafValuesForBindings<B> => {
    const setMultiLeafValues = useSelector((s) => s.setMultiLeafValues);

    return useCallback(
      (changes: { binding: keyof B; newValue: any }[]) => {
        const realChanges: FDNewValues = {
          changes: [],
          debounceTimeout: typeof saveWhileTyping === 'number' ? saveWhileTyping : undefined,
        };

        for (const change of changes) {
          const { binding: key, newValue } = change;
          const bindingPath = (bindings as any)[key];
          if (!bindingPath) {
            const keyAsString = key as string;
            window.logWarn(
              `No data model binding found for ${keyAsString}, silently ignoring request to save ${newValue}`,
            );
            return;
          }
          realChanges.changes.push({
            path: bindingPath,
            newValue,
          });
        }

        if (realChanges.changes.length > 0) {
          setMultiLeafValues(realChanges);
        }
      },
      [bindings, saveWhileTyping, setMultiLeafValues],
    );
  },

  /**
   * The locking functionality allows you to prevent form data from saving, even if the user stops typing (or navigates
   * to the next page). This is useful if you want to perform a server-side action that requires the form data to be
   * in a certain state. Locking will effectively ignore all saving until you unlock it again.
   */
  useLocking(lockId: string) {
    const rawLock = useSelector((s) => s.lock);
    const rawUnlock = useSelector((s) => s.unlock);
    const requestSave = useRequestManualSave();

    const lockedBy = useSelector((s) => s.controlState.lockedBy);
    const lockedByRef = useAsRef(lockedBy);
    const isLocked = lockedBy !== undefined;
    const isLockedRef = useAsRef(isLocked);
    const isLockedByMe = lockedBy === lockId;
    const isLockedByMeRef = useAsRef(isLockedByMe);

    const hasUnsavedChanges = useHasUnsavedChanges();
    const hasUnsavedChangesRef = useAsRef(hasUnsavedChanges);
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

      if (hasUnsavedChangesRef.current) {
        requestSave();
        await waitForSave();
      }

      rawLock(lockId);
      return true;
    }, [hasUnsavedChangesRef, isLockedByMeRef, isLockedRef, lockId, lockedByRef, rawLock, requestSave, waitForSave]);

    const unlock = useCallback(
      (newModel?: object) => {
        if (!isLockedRef.current) {
          window.logWarn(`Form data is not locked, cannot unlock it (requested by ${lockId})`);
        }
        if (!isLockedByMeRef.current) {
          window.logWarn(`Form data is locked by ${lockedByRef.current}, cannot unlock it (requested by ${lockId})`);
        }
        if (!isLockedRef.current || !isLockedByMeRef.current) {
          return false;
        }

        rawUnlock(newModel);
        return true;
      },
      [isLockedRef, isLockedByMeRef, lockId, lockedByRef, rawUnlock],
    );

    return { lock, unlock, isLocked, lockedBy, isLockedByMe };
  },

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
   * Returns true if the form data has unsaved changes
   * This will work (and return false) even if there is no FormDataWriteProvider in the tree.
   */
  useHasUnsavedChanges,

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
   * Returns a function to remove a value from a list, by index. You should try to avoid using this, as it might
   * not do what you want if it is triggered at a moment where your copy of the form data is outdated. Calling this
   * function twice in a row for index 0 will remove the first item in the list, even if the list has changed in
   * the meantime.
   */
  useRemoveIndexFromList: () => useSelector((s) => s.removeIndexFromList),

  /**
   * Returns a function to remove a value from a list, by value. If your list contains unique values, this is the
   * safer alternative to useRemoveIndexFromList().
   */
  useRemoveValueFromList: () => useSelector((s) => s.removeValueFromList),
};
