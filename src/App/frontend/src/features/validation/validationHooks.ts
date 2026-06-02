import { useCallback } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { usePdfLayoutName, useRawPageOrder } from 'src/features/form/layoutSettings/processLayoutSettings';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { FrontendValidationSource } from 'src/features/validation';
import {
  buildDerivedValidationState,
  emptyBreakdown,
  getDescendantIds,
  getNodeRefValidations,
  getValidationsForNode,
} from 'src/features/validation/deriveValidationState';
import { useAsRef } from 'src/hooks/useAsRef';
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

/**
 * Returns a stable callback that derives from the store snapshot available when
 * it is called. This is used by event handlers that must not read render-time
 * derived state after newer form data has reached the store.
 */
function useDerivedStateWithFreshBuilder() {
  const store = FormStore.raw.useStore();
  const { derived, inputs } = useDerivedStateSnapshot();
  const inputsRef = useAsRef(inputs);

  return useCallback(() => {
    // Keep consumers reactive while rebuilding from the latest store snapshot when they read.
    void derived;
    return buildDerivedValidationState(store.getState(), inputsRef.current);
  }, [derived, inputsRef, store]);
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

/** Returns visible validations for a generated node and its descendants. */
export function useVisibleValidationsDeep(
  indexedId: string,
  mask: NodeVisibility,
  includeSelf: boolean,
  restriction?: number,
  severity?: ValidationSeverity,
): NodeRefValidation[] {
  const selector = useVisibleValidationsDeepSelector();
  return selector(indexedId, mask, includeSelf, restriction, severity);
}

/**
 * Returns a callback for reading deep validations from the latest store state.
 * This is suitable for event handlers that run after the rendering snapshot.
 */
export function useVisibleValidationsDeepSelector() {
  const buildFreshDerivedState = useDerivedStateWithFreshBuilder();
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

/** Returns a callback for reading one generated node's validations from the latest store state. */
export function useValidationsSelector() {
  const buildFreshDerivedState = useDerivedStateWithFreshBuilder();
  return useCallback(
    (nodeId: string, mask: NodeVisibility, severity?: ValidationSeverity, includeHidden = false) =>
      getValidationsForNode(buildFreshDerivedState(), nodeId, mask, severity, includeHidden),
    [buildFreshDerivedState],
  );
}

/** Returns a callback for reading validations across all generated nodes from the latest store state. */
export function useGetNodesWithErrors() {
  const buildFreshDerivedState = useDerivedStateWithFreshBuilder();
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
