import { useCallback } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrap';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation/index';
import { selectValidations } from 'src/features/validation/utils';
import { nodesProduce } from 'src/utils/layout/nodesProduce';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { ContextNotProvided } from 'src/core/contexts/context';
import type { FormStoreSet, FormStoreState } from 'src/features/form/FormContext';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type {
  AnyValidation,
  AttachmentValidation,
  NodeRefValidation,
  NodeVisibility,
  ValidationSeverity,
} from 'src/features/validation/index';

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
  extraFunctions: {
    setNodeVisibility: (nodeIds: string[], newVisibility: number) => void;
    setAttachmentVisibility: (attachmentId: string, nodeId: string, newVisibility: number) => void;
  };
  extraHooks: {
    useSetNodeVisibility: () => ValidationStorePluginConfig['extraFunctions']['setNodeVisibility'];
    useSetAttachmentVisibility: () => ValidationStorePluginConfig['extraFunctions']['setAttachmentVisibility'];
    useRawValidationVisibility: (nodeId: string | undefined) => number;
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
    ) => [string[], AnyValidation[]];
    usePageHasVisibleRequiredValidations: (pageKey: string | undefined) => boolean;
  };
}

const emptyArray: never[] = [];

export class ValidationStorePlugin extends NodeDataPlugin<ValidationStorePluginConfig> {
  extraFunctions(set: FormStoreSet) {
    const out: ValidationStorePluginConfig['extraFunctions'] = {
      setNodeVisibility: (nodes, newVisibility) => {
        set(
          nodesProduce((state) => {
            for (const nodeId of nodes) {
              const nodeData = state.nodeData[nodeId];
              if (nodeData && 'validationVisibility' in nodeData && 'initialVisibility' in nodeData) {
                nodeData.validationVisibility = newVisibility | nodeData.initialVisibility;
              }
            }
          }),
        );
      },
      setAttachmentVisibility: (attachmentId, nodeId, newVisibility) => {
        set(
          nodesProduce((state) => {
            const nodeData = state.nodeData[nodeId];
            if (nodeData && 'validations' in nodeData) {
              for (const validation of nodeData.validations) {
                if ('attachmentId' in validation && validation.attachmentId === attachmentId) {
                  const v = validation as AttachmentValidation;
                  v.visibility = newVisibility;
                }
              }
            }
          }),
        );
      },
    };

    return { ...out };
  }

  extraHooks(): ValidationStorePluginConfig['extraHooks'] {
    return {
      useSetNodeVisibility: () => FormStore.raw.useSelector((state) => state.nodes.setNodeVisibility),
      useSetAttachmentVisibility: () => FormStore.raw.useSelector((state) => state.nodes.setAttachmentVisibility),
      useRawValidationVisibility: (nodeId) =>
        FormStore.raw.useSelector((state) => {
          const nodes = state.nodes;
          if (!nodeId) {
            return 0;
          }
          const nodeData = nodes.nodeData[nodeId];
          if (!nodeData) {
            return 0;
          }
          return 'validationVisibility' in nodeData ? nodeData.validationVisibility : 0;
        }),
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

            const outNodes: string[] = [];
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
                outNodes.push(id);
                outValidations.push(...validations);
              }
            }
            return [outNodes, outValidations];
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
  lookups: LayoutLookups | undefined;
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
  if (!nodeData || !('validations' in nodeData) || !('validationVisibility' in nodeData) || !nodeData.isValid) {
    return emptyArray;
  }

  if (!includeHidden && lookups && nodeData.hidden) {
    return emptyArray;
  }

  const nodeVisibility = nodeData.validationVisibility;
  const visibilityMask =
    mask === 'visible'
      ? nodeVisibility
      : mask === 'showAll'
        ? nodeVisibility | ValidationMask.Backend | ValidationMask.CustomBackend
        : mask;

  const validations = selectValidations(nodeData.validations, visibilityMask, severity);
  return validations.length > 0 ? validations : emptyArray;
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
