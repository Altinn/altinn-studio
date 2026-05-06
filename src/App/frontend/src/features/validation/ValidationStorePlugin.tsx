import { useCallback } from 'react';

import dot from 'dot-object';

import { FormStore } from 'src/features/form/FormContext';
import { getRepeatingBinding, isRepeatingComponentType } from 'src/features/form/layout/utils/repeating';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrap';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation/index';
import { getInitialMaskFromItem, selectValidations } from 'src/features/validation/utils';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { ContextNotProvided } from 'src/core/contexts/context';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type {
  AnyValidation,
  NodeRefValidation,
  NodeVisibility,
  ValidationSeverity,
} from 'src/features/validation/index';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IDataModelBindings } from 'src/layout/layout';

export type ValidationsSelector = (
  nodeId: string,
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden?: boolean, // Defaults to false
) => AnyValidation[];

export type LaxValidationsSelector = (
  nodeId: string,
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden?: boolean, // Defaults to false
) => typeof ContextNotProvided | AnyValidation[];

export interface ValidationStorePluginConfig {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  extraFunctions: {};
  extraHooks: {
    useValidationVisibility: (nodeId: string | undefined) => number;
    useValidationVisibilityBreakdown: (nodeId: string | undefined) => ValidationVisibilityBreakdown;
    useRawValidations: (nodeId: string | undefined) => AnyValidation[];
    useVisibleValidations: (indexedId: string, showAll?: boolean) => AnyValidation[];
    useVisibleValidationsDeep: (
      indexedId: string,
      mask: NodeVisibility,
      includeSelf: boolean,
      restriction?: number | undefined,
      severity?: ValidationSeverity,
    ) => NodeRefValidation[];
    useValidationsSelector: () => ValidationsSelector;
    useLaxValidationsSelector: () => LaxValidationsSelector;
    useAllValidations: (
      mask: NodeVisibility,
      severity?: ValidationSeverity,
      includeHidden?: boolean, // Defaults to false
    ) => NodeRefValidation[];
    useGetNodesWithErrors: () => (
      mask: NodeVisibility,
      severity?: ValidationSeverity,
      includeHidden?: boolean, // Defaults to false
    ) => AnyValidation[];
    usePageHasVisibleRequiredValidations: (pageKey: string | undefined) => boolean;
  };
}

const emptyArray: never[] = [];

export interface ValidationVisibilityBreakdown {
  initial: number;
  form: number;
  page: number;
  row: number;
  effective: number;
}

const emptyVisibilityBreakdown: ValidationVisibilityBreakdown = {
  initial: 0,
  form: 0,
  page: 0,
  row: 0,
  effective: 0,
};

export class ValidationStorePlugin extends NodeDataPlugin<ValidationStorePluginConfig> {
  extraFunctions() {
    return {};
  }

  extraHooks(): ValidationStorePluginConfig['extraHooks'] {
    return {
      useValidationVisibility: (nodeId) => {
        const lookups = FormBootstrap.useLayoutLookups();
        return FormStore.raw.useSelector((state) => {
          if (!nodeId) {
            return 0;
          }
          return getEffectiveValidationMask(state, nodeId, lookups);
        });
      },
      useValidationVisibilityBreakdown: (nodeId) => {
        const lookups = FormBootstrap.useLayoutLookups();
        return FormStore.raw.useShallowSelector((state) => {
          if (!nodeId) {
            return emptyVisibilityBreakdown;
          }
          return getValidationVisibilityBreakdown(state, nodeId, lookups);
        });
      },
      useRawValidations: (nodeId) =>
        FormStore.raw.useShallowSelector((state) => {
          if (!nodeId) {
            return emptyArray;
          }
          const nodeData = state.nodes.nodeData[nodeId];
          if (!nodeData) {
            return emptyArray;
          }
          const out = 'validations' in nodeData ? nodeData.validations : undefined;
          return out && out.length > 0 ? out : emptyArray;
        }),
      useVisibleValidations: (indexedId, showAll) => {
        const lookups = FormBootstrap.useLayoutLookups();
        return FormStore.raw.useShallowSelector((state) => {
          if (!indexedId) {
            return emptyArray;
          }
          const { baseComponentId } = splitDashedKey(indexedId);
          return getValidations({
            state,
            id: indexedId,
            baseId: baseComponentId,
            mask: showAll ? 'showAll' : 'visible',
            lookups,
          });
        });
      },
      useVisibleValidationsDeep: (indexedId, mask, includeSelf, restriction, severity) => {
        const lookups = FormBootstrap.useLayoutLookups();
        return FormStore.raw.useMemoSelector((state) => {
          const { baseComponentId } = splitDashedKey(indexedId);
          const output: NodeRefValidation[] = [];
          getRecursiveValidations({
            state,
            id: indexedId,
            baseId: baseComponentId,
            mask,
            severity,
            includeSelf,
            restriction,
            lookups,
            baseToIndexedMap: makeComponentIdIndex(state),
            output,
          });
          return output;
        });
      },
      useValidationsSelector: () => {
        const lookups = FormBootstrap.useLayoutLookups();
        return FormStore.raw.useDelayedSelector({
          mode: 'simple',
          selector:
            (nodeId: string, mask: NodeVisibility, severity?: ValidationSeverity, includeHidden: boolean = false) =>
            (state: FormStoreState) => {
              const { baseComponentId } = splitDashedKey(nodeId);
              return getValidations({
                state,
                id: nodeId,
                baseId: baseComponentId,
                mask,
                severity,
                includeHidden,
                lookups,
              });
            },
        });
      },
      useLaxValidationsSelector: () => {
        const lookups = FormBootstrap.useLayoutLookups();
        return FormStore.raw.useLaxDelayedSelector({
          mode: 'simple',
          selector:
            (nodeId: string, mask: NodeVisibility, severity?: ValidationSeverity, includeHidden: boolean = false) =>
            (state: FormStoreState) => {
              const { baseComponentId } = splitDashedKey(nodeId);
              return getValidations({
                state,
                id: nodeId,
                baseId: baseComponentId,
                mask,
                severity,
                includeHidden,
                lookups,
              });
            },
        });
      },
      useAllValidations: (mask, severity, includeHidden) => {
        const lookups = FormBootstrap.useLayoutLookups();
        return FormStore.raw.useMemoSelector((state) => {
          const out: NodeRefValidation[] = [];
          for (const nodeData of Object.values(state.nodes.nodeData)) {
            const id = nodeData.id;
            const validations = getValidations({
              state,
              id,
              baseId: nodeData.baseId,
              mask,
              severity,
              includeHidden,
              lookups,
            });
            for (const validation of validations) {
              out.push({ ...validation, nodeId: id, baseComponentId: nodeData.baseId });
            }
          }

          return out;
        });
      },
      useGetNodesWithErrors: () => {
        const zustand = FormStore.raw.useStore();
        const lookups = FormBootstrap.useLayoutLookups();
        return useCallback(
          (mask, severity, includeHidden = false) => {
            // This is intentionally not reactive, as it is used once when a function is called. There's no need to
            // constantly recompute this.
            const state = zustand.getState();

            const outValidations: AnyValidation[] = [];
            for (const id of Object.keys(state.nodes.nodeData)) {
              const data = state.nodes.nodeData[id];
              const validations = getValidations({
                state,
                id,
                baseId: data.baseId,
                mask,
                severity,
                includeHidden,
                lookups,
              });
              if (validations.length > 0) {
                outValidations.push(...validations);
              }
            }
            return outValidations;
          },
          [zustand, lookups],
        );
      },
      usePageHasVisibleRequiredValidations: (pageKey) => {
        const lookups = FormBootstrap.useLayoutLookups();
        return FormStore.raw.useSelector((state) => {
          if (!pageKey) {
            return false;
          }

          for (const nodeData of Object.values(state.nodes.nodeData)) {
            if (!nodeData || nodeData.pageKey !== pageKey) {
              continue;
            }

            const id = nodeData.id;
            const validations = getValidations({
              state,
              id,
              baseId: nodeData.baseId,
              mask: 'visible',
              severity: 'error',
              lookups,
            });
            for (const validation of validations) {
              if (validation.source === FrontendValidationSource.EmptyField) {
                return true;
              }
            }
          }

          return false;
        });
      },
    };
  }
}

interface GetValidationsProps {
  state: FormStoreState;
  id: string;
  baseId: string;
  mask: NodeVisibility;
  severity?: ValidationSeverity;
  includeHidden?: boolean;
  lookups: LayoutLookups;
}

function getValidations({
  state,
  id,
  mask,
  severity,
  includeHidden = false,
  lookups,
}: GetValidationsProps): AnyValidation[] {
  const nodeData = state.nodes.nodeData[id];
  if (!nodeData || !('validations' in nodeData) || !nodeData.isValid) {
    return emptyArray;
  }

  if (!includeHidden && lookups && nodeData.hidden) {
    return emptyArray;
  }

  const nodeVisibility = getEffectiveValidationMask(state, id, lookups);
  const visibilityMask =
    mask === 'visible'
      ? nodeVisibility
      : mask === 'showAll'
        ? nodeVisibility | ValidationMask.Backend | ValidationMask.CustomBackend
        : mask;

  const validations = selectValidations(nodeData.validations, visibilityMask, severity);
  return validations.length > 0 ? validations : emptyArray;
}

export function getEffectiveValidationMask(state: FormStoreState, nodeId: string, lookups: LayoutLookups) {
  return getValidationVisibilityBreakdown(state, nodeId, lookups).effective;
}

export function getValidationVisibilityBreakdown(
  state: FormStoreState,
  nodeId: string,
  lookups: LayoutLookups,
): ValidationVisibilityBreakdown {
  const nodeData = state.nodes.nodeData[nodeId];
  if (!nodeData) {
    return emptyVisibilityBreakdown;
  }

  const initialMask = getInitialVisibilityMask(nodeData.baseId, lookups);
  const formMask = state.validation?.formMask ?? 0;
  const pageMask = state.validation?.pageMasks?.[nodeData.pageKey] ?? 0;
  const rowMask = getRowMaskForNode(state, nodeId);

  return {
    initial: initialMask,
    form: formMask,
    page: pageMask,
    row: rowMask,
    effective: initialMask | formMask | pageMask | rowMask,
  };
}

export function getInitialVisibilityMask(baseId: string, lookups: LayoutLookups) {
  if (!lookups) {
    return 0;
  }

  return getInitialMaskFromItem(lookups.allComponents[baseId]);
}

export function getRowMaskForNode(state: FormStoreState, nodeId: string) {
  let mask = 0;
  for (const rowId of getRowIdsForNode(state, nodeId)) {
    mask |= state.validation?.rowMasks?.[rowId] ?? 0;
  }
  return mask;
}

/**
 * Pruning boundary masks happens when validation state change. This will remove any masks that force validations to
 * be visible (in the entire form, on a page, in a row). We do this on validation state change to clean up masks
 * so that the visibility resets when the user fixes validation errors after getting the 'you need to fix these errors'
 * message on the bottom of the form.
 *
 * @see ErrorReport
 */
export function pruneBoundaryMasks(state: FormStoreState) {
  const { formMask, pageMasks, rowMasks } = state.validation;
  if (!formMask && Object.keys(pageMasks).length === 0 && Object.keys(rowMasks).length === 0) {
    return;
  }

  const pageMatches = new Set<string>();
  const rowMatches = new Set<string>();
  let hasFormErrors = false;

  for (const node of Object.values(state.nodes.nodeData)) {
    if (!node || !('validations' in node) || node.hidden || !node.isValid) {
      continue;
    }

    if (formMask && !hasFormErrors && selectValidations(node.validations, formMask, 'error').length > 0) {
      hasFormErrors = true;
    }

    const pageMask = pageMasks[node.pageKey];
    if (
      pageMask &&
      !pageMatches.has(node.pageKey) &&
      selectValidations(node.validations, pageMask, 'error').length > 0
    ) {
      pageMatches.add(node.pageKey);
    }

    if (Object.keys(rowMasks).length === 0) {
      continue;
    }

    for (const rowId of getRowIdsForNode(state, node.id)) {
      const rowMask = rowMasks[rowId];
      if (!rowMask || rowMatches.has(rowId)) {
        continue;
      }
      if (selectValidations(node.validations, rowMask, 'error').length > 0) {
        rowMatches.add(rowId);
      }
    }
  }

  if (formMask && !hasFormErrors) {
    state.validation.formMask = 0;
  }

  for (const [pageKey, pageMask] of Object.entries(pageMasks)) {
    if (pageMask && !pageMatches.has(pageKey)) {
      delete state.validation.pageMasks[pageKey];
    }
  }

  for (const [rowId, rowMask] of Object.entries(rowMasks)) {
    if (rowMask && !rowMatches.has(rowId)) {
      delete state.validation.rowMasks[rowId];
    }
  }
}

export function getRowIdsForNode(state: FormStoreState, nodeId: string): string[] {
  const rowIds: string[] = [];
  let childId = nodeId;
  let parentId = state.nodes.nodeData[childId]?.parentId;

  while (parentId) {
    const child = state.nodes.nodeData[childId];
    const parent = state.nodes.nodeData[parentId];
    if (!child || !parent) {
      break;
    }

    if (isRepeatingComponentType(parent.nodeType) && child.rowIndex !== undefined) {
      const groupBinding = getRepeatingBinding(
        parent.nodeType,
        parent.dataModelBindings as IDataModelBindings<typeof parent.nodeType>,
      );
      const rowId = groupBinding ? getRowIdForIndex(state, groupBinding, child.rowIndex) : undefined;
      if (rowId) {
        rowIds.push(rowId);
      }
    }

    childId = parentId;
    parentId = state.nodes.nodeData[childId]?.parentId;
  }

  return rowIds;
}

function getRowIdForIndex(state: FormStoreState, groupBinding: IDataModelReference, rowIndex: number) {
  const rawRows = dot.pick(groupBinding.field, state.data.models[groupBinding.dataType]?.currentData);
  if (!Array.isArray(rawRows)) {
    return undefined;
  }

  const rowId = rawRows[rowIndex]?.[ALTINN_ROW_ID];
  return typeof rowId === 'string' ? rowId : undefined;
}

interface GetDeepValidationsProps extends GetValidationsProps {
  output: NodeRefValidation[];
  includeSelf: boolean;
  restriction?: number | undefined;
  baseToIndexedMap: Map<string, string[]>;
}

export function getRecursiveValidations(props: GetDeepValidationsProps) {
  if (props.includeSelf) {
    const nodeValidations = getValidations(props);
    for (const validation of nodeValidations) {
      props.output.push({ ...validation, nodeId: props.id, baseComponentId: props.baseId });
    }
  }

  for (const child of getChildren(props)) {
    getRecursiveValidations({
      ...props,
      id: child.id,
      baseId: child.baseId,

      // Restriction and includeSelf should only be applied to the first level (not recursively)
      restriction: undefined,
      includeSelf: true,
    });
  }
}

function getChildren(props: GetDeepValidationsProps): { id: string; baseId: string }[] {
  const children: { id: string; baseId: string }[] = [];
  if (!props.lookups) {
    return children;
  }

  const { depth } = splitDashedKey(props.id);
  const parentSuffix = depth.length ? `-${depth.join('-')}` : '';
  const childBaseIds = props.lookups.componentToChildren[props.baseId] ?? [];
  for (const childBaseId of childBaseIds) {
    const lookForSuffix = props.restriction === undefined ? parentSuffix : `${parentSuffix}-${props.restriction}`;
    const childId = `${childBaseId}${lookForSuffix}`;

    for (const idToCheck of props.baseToIndexedMap.get(childBaseId) ?? []) {
      const childData = props.state.nodes.nodeData[idToCheck];
      if (!childData || (idToCheck !== childId && !idToCheck.startsWith(`${childId}-`))) {
        continue;
      }
      children.push({ id: childData.id, baseId: childData.baseId });
    }
  }

  return children;
}

export function makeComponentIdIndex(state: FormStoreState) {
  const out = new Map<string, string[]>();
  for (const id of Object.keys(state.nodes.nodeData)) {
    const data = state.nodes.nodeData[id];
    if (!data) {
      continue;
    }
    const baseId = data.baseId;
    const children = out.get(baseId) ?? [];
    children.push(id);
    out.set(baseId, children);
  }

  return out;
}
