import { useCallback } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useLayoutLookups, useLayoutLookupsLax } from 'src/features/form/layout/LayoutsContext';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation/index';
import { selectValidations } from 'src/features/validation/utils';
import { nodesProduce } from 'src/utils/layout/NodesContext';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type {
  AnyValidation,
  AttachmentValidation,
  NodeRefValidation,
  NodeVisibility,
  ValidationSeverity,
} from 'src/features/validation/index';
import type { NodesContext, NodesStoreFull } from 'src/utils/layout/NodesContext';
import type { NodeDataPluginSetState } from 'src/utils/layout/plugins/NodeDataPlugin';

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
    useLaxSetNodeVisibility: () =>
      | ValidationStorePluginConfig['extraFunctions']['setNodeVisibility']
      | typeof ContextNotProvided;
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
    ) => NodeRefValidation[] | typeof ContextNotProvided;
    useGetNodesWithErrors: () => (
      mask: NodeVisibility,
      severity?: ValidationSeverity,
      includeHidden?: boolean, // Defaults to false
    ) => [string[], AnyValidation[]] | typeof ContextNotProvided;
    usePageHasVisibleRequiredValidations: (pageKey: string | undefined) => boolean;
  };
}

const emptyArray: never[] = [];

export class ValidationStorePlugin extends NodeDataPlugin<ValidationStorePluginConfig> {
  extraFunctions(set: NodeDataPluginSetState) {
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

  extraHooks(store: NodesStoreFull): ValidationStorePluginConfig['extraHooks'] {
    return {
      useSetNodeVisibility: () => store.useSelector((state) => state.setNodeVisibility),
      useLaxSetNodeVisibility: () => store.useLaxSelector((state) => state.setNodeVisibility),
      useSetAttachmentVisibility: () => store.useSelector((state) => state.setAttachmentVisibility),
      useRawValidationVisibility: (nodeId) =>
        store.useSelector((state) => {
          if (!nodeId) {
            return 0;
          }
          const nodeData = state.nodeData[nodeId];
          if (!nodeData) {
            return 0;
          }
          return 'validationVisibility' in nodeData ? nodeData.validationVisibility : 0;
        }),
      useRawValidations: (nodeId) =>
        store.useShallowSelector((state) => {
          if (!nodeId) {
            return emptyArray;
          }
          const nodeData = state.nodeData[nodeId];
          if (!nodeData) {
            return emptyArray;
          }
          const out = 'validations' in nodeData ? nodeData.validations : undefined;
          return out && out.length > 0 ? out : emptyArray;
        }),
      useVisibleValidations: (indexedId, showAll) => {
        const lookups = useLayoutLookups();
        return store.useShallowSelector((state) => {
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
        const lookups = useLayoutLookups();
        return store.useMemoSelector((state) => {
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
        const lookups = useLayoutLookups();
        return store.useDelayedSelector({
          mode: 'simple',
          selector:
            (nodeId: string, mask: NodeVisibility, severity?: ValidationSeverity, includeHidden: boolean = false) =>
            (state: NodesContext) => {
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
        }) satisfies ValidationsSelector;
      },
      useLaxValidationsSelector: () => {
        const lookups = useLayoutLookups();
        return store.useLaxDelayedSelector({
          mode: 'simple',
          selector:
            (nodeId: string, mask: NodeVisibility, severity?: ValidationSeverity, includeHidden: boolean = false) =>
            (state: NodesContext) => {
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
        }) satisfies ValidationsSelector;
      },
      useAllValidations: (mask, severity, includeHidden) => {
        const lookups = useLayoutLookups();
        return store.useLaxMemoSelector((state) => {
          const out: NodeRefValidation[] = [];
          for (const nodeData of Object.values(state.nodeData)) {
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
        const zustand = store.useLaxStore();
        const lookups = useLayoutLookupsLax();
        return useCallback(
          (mask, severity, includeHidden = false) => {
            if (zustand === ContextNotProvided) {
              return ContextNotProvided;
            }

            // This is intentionally not reactive, as it is used once when a function is called. There's no need to
            // constantly recompute this.
            const state = zustand.getState();

            const outNodes: string[] = [];
            const outValidations: AnyValidation[] = [];
            for (const id of Object.keys(state.nodeData)) {
              const data = state.nodeData[id];
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
        const lookups = useLayoutLookups();
        return store.useSelector((state) => {
          if (!pageKey) {
            return false;
          }

          for (const nodeData of Object.values(state.nodeData)) {
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
  state: NodesContext;
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
  const nodeData = state.nodeData[id];
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
      const childData = props.state.nodeData[idToCheck];
      if (!childData || (idToCheck !== childId && !idToCheck.startsWith(`${childId}-`))) {
        continue;
      }
      children.push({ id: childData.id, baseId: childData.baseId });
    }
  }

  return children;
}

export function makeComponentIdIndex(state: NodesContext) {
  const out = new Map<string, string[]>();
  for (const id of Object.keys(state.nodeData)) {
    const data = state.nodeData[id];
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
