import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import deepEqual from 'fast-deep-equal';
import type { Draft } from 'immer';

import { useGetCachedInitialValidations, useRefetchInitialValidations } from 'src/core/queries/backendValidation';
import { hasPendingAttachments } from 'src/features/attachments/utils';
import { FormStore } from 'src/features/form/FormContext';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import {
  type BackendValidationIssue,
  type BaseValidation,
  type FieldValidations,
  ValidationMask,
  type ValidationsProcessedLast,
  type WaitForValidation,
} from 'src/features/validation';
import { BackendValidation } from 'src/features/validation/backendValidation/BackendValidation';
import {
  mapBackendIssuesToTaskValidations,
  mapBackendValidationsToValidatorGroups,
  mapValidatorGroupsToDataModelValidations,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import { useWaitForNodesToValidate } from 'src/features/validation/nodeValidation/waitForNodesToValidate';
import { hasValidationErrors, selectValidations } from 'src/features/validation/utils';
import { pruneBoundaryMasks } from 'src/features/validation/ValidationStorePlugin';
import { useWaitForState } from 'src/hooks/useWaitForState';
import type { FormStoreSet, FormStoreState } from 'src/features/form/FormContext';
import type { FormBootstrapContextValue } from 'src/features/formBootstrap/types';
import type { DataModelValidationState } from 'src/features/formData/FormDataWriteStateMachine';

export interface ValidationInternals {
  processedLast: ValidationsProcessedLast; // This should only be used to check if we have finished processing the last validations from backend so that we know if the validation state is up to date
  /**
   * updateDataModelValidations
   * if validations is undefined, nothing will be changed
   */
  updateDataModelValidations: (
    key: Exclude<keyof DataModelValidationState, 'backend'>,
    dataType: string,
    validations?: FieldValidations,
  ) => void;
  updateBackendValidations: (
    backendValidations: { [dataElementId: string]: FieldValidations } | undefined,
    processedLast?: Partial<ValidationsProcessedLast>,
    taskValidations?: BaseValidation[],
  ) => void;
  setOtherDataElementBackendValidations: (dataElementId: string, validationIssues: BackendValidationIssue[]) => void;
}

export function createValidationSlice(
  bootstrap: FormBootstrapContextValue,
  set: FormStoreSet,
): FormStoreState['validation'] {
  return {
    // =======
    // Publicly exposed state
    state: {
      task: mapBackendIssuesToTaskValidations(bootstrap.validationIssues ?? []),
    },
    otherDataElementBackendValidations: {},
    formMask: 0,
    pageMasks: {},
    rowMasks: {},
    setFormMask: (mask) =>
      set((state) => {
        state.validation.formMask = mask ?? 0;
      }),
    setPageMask: (pageKey, mask) =>
      set((state) => {
        if (mask === undefined) {
          delete state.validation.pageMasks[pageKey];
        } else {
          state.validation.pageMasks[pageKey] = mask;
        }
      }),
    setRowMask: (rowId, mask) =>
      set((state) => {
        if (mask === undefined) {
          delete state.validation.rowMasks[rowId];
        } else {
          state.validation.rowMasks[rowId] = mask;
        }
      }),
    setShowAllUnboundValidations: (newValue) =>
      set((state) => {
        state.validation.showAllUnboundValidations = newValue;
      }),
    showAllUnboundValidations: false,

    // =======
    // Internal state
    processedLast: {
      initial: bootstrap.allInitialValidations,
      incremental: undefined,
    },
    updateDataModelValidations: (key, dataType, validations) =>
      set((state) => {
        const dataModel = state.data.models[dataType];
        if (dataModel && validations) {
          dataModel.validations[key] = validations;
          pruneBoundaryMasks(state);
        }
      }),
    updateBackendValidations: (backendValidations, processedLast, taskValidations) =>
      set((state) => {
        updateBackendValidations(state)(backendValidations, processedLast, taskValidations);
        pruneBoundaryMasks(state);
      }),
    setOtherDataElementBackendValidations: (dataElementId, validationIssues) =>
      set((state) => {
        if (!getMountedDataElementIds(state).has(dataElementId)) {
          const validations = mapValidatorGroupsToDataModelValidations(
            mapBackendValidationsToValidatorGroups(validationIssues),
          )[dataElementId];

          if (validations && Object.keys(validations).length > 0) {
            state.validation.otherDataElementBackendValidations[dataElementId] = validations;
          } else {
            delete state.validation.otherDataElementBackendValidations[dataElementId];
          }

          pruneBoundaryMasks(state);
        }
      }),
  };
}

export function updateBackendValidations(
  state: Draft<FormStoreState>,
): ValidationInternals['updateBackendValidations'] {
  return (backendValidations, processedLast, taskValidations) => {
    if (
      processedLast?.incremental &&
      !deepEqual(state.validation.processedLast.incremental, processedLast.incremental)
    ) {
      state.validation.processedLast.incremental = processedLast.incremental;
    }
    if (processedLast?.initial) {
      state.validation.processedLast.initial = processedLast.initial;
    }
    if (taskValidations) {
      state.validation.state.task = taskValidations;
    }
    if (backendValidations) {
      for (const [dataType, model] of Object.entries(state.data.models)) {
        const dataModelKey = model.dataElementId ?? dataType;
        model.validations.backend = backendValidations[dataModelKey] ?? {};
      }

      if (!state.parent) {
        const mountedDataElementIds = getMountedDataElementIds(state);
        const isFullSnapshotUpdate = Boolean(processedLast?.initial);
        if (isFullSnapshotUpdate) {
          state.validation.otherDataElementBackendValidations = {};
        }
        for (const [dataElementId, validations] of Object.entries(backendValidations)) {
          if (!mountedDataElementIds.has(dataElementId)) {
            state.validation.otherDataElementBackendValidations[dataElementId] = validations;
          }
        }
      }
    }
  };
}

function getMountedDataElementIds(state: Pick<FormStoreState, 'data'>): Set<string> {
  const mountedDataElementIds = new Set<string>();
  for (const [dataType, model] of Object.entries(state.data.models)) {
    mountedDataElementIds.add(model.dataElementId ?? dataType);
  }
  return mountedDataElementIds;
}

export function ValidationEffects() {
  return (
    <>
      <BackendValidation />
      <ManageShowAllErrors />
    </>
  );
}

export function useWaitForValidation(): WaitForValidation {
  const waitForNodesReady = FormStore.nodes.useWaitUntilReady();
  const waitForSave = FormStore.data.useWaitForSave();
  const waitForState = useWaitForState<undefined, FormStoreState>(FormStore.raw.useStore());

  const hasWritableDataTypes = !!FormStore.bootstrap.useWritableDataTypes()?.length;
  const getCachedInitialValidations = useGetCachedInitialValidations();
  const waitForNodesToValidate = useWaitForNodesToValidate();

  return useCallback(
    async (forceSave = true) => {
      if (!hasWritableDataTypes) {
        // Even when validation is not enabled, we may still have pending query data written by
        // updateInitialValidations() (e.g. from process/next returning task validation issues).
        // Wait for BackendValidation to process it into the zustand store before returning.
        await waitForState((state) => {
          const { isFetching, cachedInitialValidations } = getCachedInitialValidations();
          return (
            !isFetching &&
            deepEqual(state.validation.processedLast.initial, cachedInitialValidations) &&
            !hasPendingAttachments(state)
          );
        });
        return;
      }

      // Wait until we've saved changed to backend, and we've processed the backend validations we got from that save
      await waitForNodesReady();
      await waitForSave(forceSave, (state) => {
        const { isFetching, cachedInitialValidations } = getCachedInitialValidations();
        const initialMatch = deepEqual(state.validation.processedLast.initial, cachedInitialValidations);
        const pendingAttachments = hasPendingAttachments(state);

        return initialMatch && !isFetching && !pendingAttachments;
      });
      await waitForNodesToValidate();
      await waitForNodesReady();
    },
    [
      getCachedInitialValidations,
      hasWritableDataTypes,
      waitForNodesReady,
      waitForNodesToValidate,
      waitForSave,
      waitForState,
    ],
  );
}

function ManageShowAllErrors() {
  const showAllErrors = FormStore.raw.useSelector((state) => state.validation.showAllUnboundValidations);
  return showAllErrors ? <UpdateShowAllErrors /> : null;
}

function UpdateShowAllErrors() {
  const [taskValidations, dataModels, setShowAllErrors] = FormStore.raw.useShallowSelector((state) => [
    state.validation.state.task,
    state.data.models,
    state.validation.setShowAllUnboundValidations,
  ]);

  const isFirstRender = useRef(true);

  /**
   * Call /validate manually whenever a data element changes to get updated non-incremental validations.
   * This should happen whenever any data element changes, so we should check the lastChanged on each data element,
   * or if new data elements are added. Single-patch does not return updated instance data so for now we need to
   * also check useLastSaveValidationIssues which will change on each patch.
   */
  const instanceDataChanges = useInstanceDataQuery({
    select: (instance) => instance.data.map(({ id, lastChanged }) => ({ id, lastChanged })),
  }).data;

  // Since process/next returns non-incremental validations, we need to also check these to see when they are removed
  const refetchInitialValidations = useRefetchInitialValidations(false);
  useEffect(() => {
    // No need to invalidate initial validations right away
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Adding or deleting an attachment can lead to changes in both the data model and an update
    // in the attachments data elements, which can lead to two updates right after each other,
    // so debouncing a little so that we don't call validate too much as it can be heavy.
    const timer = setTimeout(() => refetchInitialValidations(), 1000);
    return () => clearTimeout(timer);
  }, [refetchInitialValidations, instanceDataChanges]);

  /**
   * Hide unbound errors as soon as possible.
   */
  useEffect(() => {
    const backendMask = ValidationMask.Backend | ValidationMask.CustomBackend;
    const hasFieldErrors =
      Object.values(dataModels)
        .map((model) => model.validations.backend)
        .flatMap((validations) => Object.values(validations))
        .flatMap((field) => selectValidations(field, backendMask, 'error')).length > 0;

    if (!hasFieldErrors && !hasValidationErrors(taskValidations)) {
      setShowAllErrors(false);
    }
  }, [dataModels, setShowAllErrors, taskValidations]);

  return null;
}

export const validationHooks = {
  useDataElementsWithErrors: (dataElementIds: string[]) =>
    FormStore.raw.useShallowSelector((state) => {
      const elementsWithErrors: string[] = [];
      for (const dataElementId of Object.keys(state.validation.otherDataElementBackendValidations)) {
        if (!dataElementIds.includes(dataElementId)) {
          continue;
        }
        const validations = state.validation.otherDataElementBackendValidations[dataElementId];
        if (Object.values(validations).some((v) => hasValidationErrors(v))) {
          elementsWithErrors.push(dataElementId);
        }
      }
      return elementsWithErrors;
    }),

  useShowAllUnboundValidations: () => FormStore.raw.useSelector((state) => state.validation.showAllUnboundValidations),
  useSetShowAllUnboundValidations: () => {
    const validating = useWaitForValidation();
    const setShowAllUnboundValidations = FormStore.raw.useStaticSelector(
      (s) => s.validation.setShowAllUnboundValidations,
    );

    return useMemo(
      () => async () => {
        // Make sure we have finished processing validations before setting showAllErrors.
        // This is because we automatically turn off this state as soon as possible.
        // If the validations to show have not finished processing, this could get turned off before they ever became visible.
        await validating();
        setShowAllUnboundValidations(true);
      },
      [setShowAllUnboundValidations, validating],
    );
  },
  useSetFormValidationMask: () => FormStore.raw.useStaticSelector((state) => state.validation.setFormMask),
  useSetPageValidationMask: () => FormStore.raw.useStaticSelector((state) => state.validation.setPageMask),
  useSetRowValidationMask: () => FormStore.raw.useStaticSelector((state) => state.validation.setRowMask),
  useUpdateBackendValidations: () =>
    FormStore.raw.useStaticSelector((state) => state.validation.updateBackendValidations),
};
