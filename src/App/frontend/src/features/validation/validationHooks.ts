import { useCallback } from 'react';

import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { useGetCachedInstanceData } from 'src/core/queries/instance';
import { FormStore } from 'src/features/form/FormContext';
import {
  processLayoutSettings,
  usePdfLayoutName,
  useRawPageOrder,
} from 'src/features/form/layoutSettings/processLayoutSettings';
import { getUiFolderSettings } from 'src/features/form/ui';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import {
  buildDerivedValidationState,
  emptyBreakdown,
  getDescendantIds,
  getNodeRefValidations,
  getValidationsForNode,
} from 'src/features/validation/deriveValidationState';
import { useAllNavigationParams } from 'src/hooks/navigation';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { AnyValidation, NodeRefValidation, NodeVisibility, ValidationSeverity } from 'src/features/validation';
import type {
  DerivedValidationStateInputs,
  ValidationVisibilityBreakdown as ValidationVisibilityBreakdownType,
} from 'src/features/validation/deriveValidationState';
import type { RuntimeOverrides } from 'src/utils/layout/useExpressionDataSources';

export type ValidationVisibilityBreakdown = ValidationVisibilityBreakdownType;

const emptyArray: never[] = [];
const hiddenExpressionRuntimeOverrides = {
  unsupportedDataSources: new Set(['displayValue']),
  errorSuffix: 'hidden expressions',
} satisfies RuntimeOverrides;

function useDerivedValidationStateInputs(): DerivedValidationStateInputs {
  const pageOrder = useRawPageOrder();
  const pdfLayoutName = usePdfLayoutName();
  const processedLayouts = FormStore.bootstrap.useLayouts();
  const layoutCollection = FormStore.bootstrap.useLayoutCollection();
  const hiddenDataSources = useExpressionDataSources(layoutCollection, hiddenExpressionRuntimeOverrides);
  const evalDataSources = useExpressionDataSources(processedLayouts);
  const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;
  const taskId = useProcessTaskId();

  return { pageOrder, pdfLayoutName, hiddenDataSources, evalDataSources, instanceData, taskId };
}

/**
 * Derives a validation snapshot during render so hooks stay reactive to form
 * state and expression dependencies without storing derived validation state.
 */
function useDerivedStateSnapshot() {
  const state = FormStore.raw.useSelector((state) => state);
  const inputs = useDerivedValidationStateInputs();
  return {
    derived: buildDerivedValidationState(state, inputs),
    inputs,
  };
}

function useDerivedState() {
  return useDerivedStateSnapshot().derived;
}

function useDerivedPageState(pageKeys: string[]) {
  const state = FormStore.raw.useSelector((state) => state);
  const inputs = useDerivedValidationStateInputs();
  return buildDerivedValidationState(state, { ...inputs, includedPageKeys: pageKeys });
}

/**
 * Returns a stable callback that derives from the store snapshot available when
 * it is called, without subscribing this hook to derived validation changes.
 */
function useFreshDerivedStateBuilder() {
  const store = FormStore.raw.useStore();
  const getCachedInstanceData = useGetCachedInstanceData();
  const taskOverrides = useTaskOverrides();
  const { instanceOwnerPartyId, instanceGuid, taskId: urlTaskId } = useAllNavigationParams();
  const formState = store.getState();
  const hiddenDataSources = useExpressionDataSources(formState.bootstrap.layouts, hiddenExpressionRuntimeOverrides);
  const evalDataSources = useExpressionDataSources(formState.bootstrap.processedLayouts);
  const snapshotInputs = useCallback((): DerivedValidationStateInputs => {
    const latestState = store.getState();
    const layoutSettings = processLayoutSettings(getUiFolderSettings(latestState.bootstrap.uiFolder));
    const instance = getCachedInstanceData(instanceOwnerPartyId, instanceGuid);

    return {
      pageOrder: layoutSettings.order,
      pdfLayoutName: layoutSettings.pdfLayoutName,
      hiddenDataSources,
      evalDataSources,
      instanceData: instance?.data ?? emptyArray,
      taskId: taskOverrides?.taskId ?? instance?.process?.currentTask?.elementId ?? urlTaskId,
    };
  }, [
    evalDataSources,
    getCachedInstanceData,
    hiddenDataSources,
    instanceGuid,
    instanceOwnerPartyId,
    store,
    taskOverrides,
    urlTaskId,
  ]);

  return useCallback(() => buildDerivedValidationState(store.getState(), snapshotInputs()), [snapshotInputs, store]);
}

/** Returns the masks that currently control validation visibility for a generated node. */
export function useValidationVisibilityBreakdown(indexedId: string | undefined): ValidationVisibilityBreakdownType {
  const derived = useDerivedState();
  return indexedId ? (derived.visibleBreakdownByNode.get(indexedId) ?? emptyBreakdown) : emptyBreakdown;
}

/** Returns every calculated validation for a generated node without applying visibility filtering. */
export function useRawValidations(indexedId: string | undefined): AnyValidation[] {
  const derived = useDerivedState();
  return indexedId ? (derived.rawValidationsByNode.get(indexedId) ?? emptyArray) : emptyArray;
}

/** Returns the validations currently visible for a generated node. */
export function useVisibleValidations(indexedId: string | undefined, showAll?: boolean): AnyValidation[] {
  const derived = useDerivedState();
  return indexedId ? getValidationsForNode(derived, indexedId, showAll ? 'showAll' : 'visible') : emptyArray;
}

/** Returns visible validations for one generated node without rerendering when unrelated validations change. */
export function useVisibleValidationsForNode(
  baseComponentId: string,
  indexedId: string | undefined,
  showAll?: boolean,
): AnyValidation[] {
  const inputs = useDerivedValidationStateInputs();
  return FormStore.raw.useMemoSelector((state) => {
    if (!indexedId) {
      return emptyArray;
    }

    const pageKey = state.bootstrap.layoutLookups.componentToPage[baseComponentId];
    const derived = buildDerivedValidationState(state, {
      ...inputs,
      includedPageKeys: pageKey ? [pageKey] : undefined,
    });
    return getValidationsForNode(derived, indexedId, showAll ? 'showAll' : 'visible');
  });
}

/** Returns visible validations for a generated node and its descendants. */
export function useVisibleValidationsDeep(
  indexedId: string,
  mask: NodeVisibility,
  includeSelf: boolean,
  restriction?: number,
  severity?: ValidationSeverity,
): NodeRefValidation[] {
  const derived = useDerivedState();
  const nodeIds = [...(includeSelf ? [indexedId] : emptyArray), ...getDescendantIds(derived, indexedId, restriction)];
  return nodeIds.flatMap((nodeId) => getNodeRefValidations(derived, nodeId, mask, severity));
}

/**
 * Returns a callback for reading deep validations from the latest store state.
 * This is suitable for event handlers that run after the rendering snapshot.
 */
export function useVisibleValidationsDeepSelector() {
  const buildFreshDerivedState = useFreshDerivedStateBuilder();
  return useCallback(
    (
      indexedId: string,
      mask: NodeVisibility,
      includeSelf: boolean,
      restriction?: number,
      severity?: ValidationSeverity,
    ): NodeRefValidation[] => {
      const freshDerived = buildFreshDerivedState();
      const nodeIds = [
        ...(includeSelf ? [indexedId] : emptyArray),
        ...getDescendantIds(freshDerived, indexedId, restriction),
      ];
      return nodeIds.flatMap((nodeId) => getNodeRefValidations(freshDerived, nodeId, mask, severity));
    },
    [buildFreshDerivedState],
  );
}

/** Returns validations across all generated nodes in the current form snapshot. */
export function useAllValidations(
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden = false,
): NodeRefValidation[] {
  const derived = useDerivedState();
  return derived.nodes.flatMap((node) => getNodeRefValidations(derived, node.id, mask, severity, includeHidden));
}

/** Returns validation arrays grouped by page from the current render snapshot. */
export function usePageValidations(pageKeys: string[]) {
  const derived = useDerivedPageState(pageKeys);
  return Object.fromEntries(
    pageKeys.map((pageKey) => {
      const nodeIds = derived.nodeIdsByPage.get(pageKey) ?? emptyArray;
      return [
        pageKey,
        {
          visibleErrors: nodeIds.flatMap((nodeId) => getValidationsForNode(derived, nodeId, 'visible', 'error')),
          allErrors: nodeIds.flatMap((nodeId) => getValidationsForNode(derived, nodeId, ValidationMask.All, 'error')),
        },
      ];
    }),
  );
}

/** Returns a callback that builds the latest validation snapshot when invoked. */
export function useGetDerivedValidationState() {
  return useFreshDerivedStateBuilder();
}

/** Returns a callback for reading validations across all generated nodes from the latest store state. */
export function useGetNodesWithErrors() {
  const buildFreshDerivedState = useFreshDerivedStateBuilder();
  return useCallback(
    (mask: NodeVisibility, severity?: ValidationSeverity, includeHidden = false) => {
      const freshDerived = buildFreshDerivedState();
      return freshDerived.nodes.flatMap((node) =>
        getValidationsForNode(freshDerived, node.id, mask, severity, includeHidden),
      );
    },
    [buildFreshDerivedState],
  );
}

/** Indicates whether a page currently contains a visible required-field validation. */
export function usePageHasVisibleRequiredValidations(pageKey: string | undefined) {
  const derived = useDerivedState();
  if (!pageKey) {
    return false;
  }

  return (derived.nodeIdsByPage.get(pageKey) ?? emptyArray).some((nodeId) =>
    getValidationsForNode(derived, nodeId, 'visible', 'error').some(
      (validation) => validation.source === FrontendValidationSource.EmptyField,
    ),
  );
}

/**
 * Returns a callback that removes form, page, and row visibility masks after
 * the validations they revealed have been resolved.
 */
export function usePruneValidationMasks() {
  const derived = useDerivedState();
  const [formMask, pageMasks, rowMasks] = FormStore.raw.useShallowSelector((state) => [
    state.validation.formMask,
    state.validation.pageMasks,
    state.validation.rowMasks,
  ]);
  const setFormMask = FormStore.validation.useSetFormValidationMask();
  const setPageMask = FormStore.validation.useSetPageValidationMask();
  const setRowMask = FormStore.validation.useSetRowValidationMask();

  const hasFormErrors =
    !formMask || derived.nodes.some((node) => getValidationsForNode(derived, node.id, formMask, 'error').length > 0);
  const stalePages = Object.entries(pageMasks)
    .filter(
      ([pageKey, mask]) =>
        !(derived.nodeIdsByPage.get(pageKey) ?? emptyArray).some(
          (nodeId) => getValidationsForNode(derived, nodeId, mask, 'error').length > 0,
        ),
    )
    .map(([pageKey]) => pageKey);
  const staleRows = Object.entries(rowMasks)
    .filter(
      ([rowId, mask]) =>
        !(derived.nodeIdsByRowId.get(rowId) ?? emptyArray).some(
          (nodeId) => getValidationsForNode(derived, nodeId, mask, 'error').length > 0,
        ),
    )
    .map(([rowId]) => rowId);

  return useCallback(() => {
    if (formMask && !hasFormErrors) {
      setFormMask(undefined);
    }
    stalePages.forEach((pageKey) => setPageMask(pageKey, undefined));
    staleRows.forEach((rowId) => setRowMask(rowId, undefined));
  }, [formMask, hasFormErrors, setFormMask, setPageMask, setRowMask, stalePages, staleRows]);
}
