import { useCallback } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useLayoutLookups, useLayoutLookupsLax } from 'src/features/form/layout/LayoutsContext';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation/index';
import { selectValidations } from 'src/features/validation/utils';
import { isHidden, nodesProduce } from 'src/utils/layout/NodesContext';
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
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IsHiddenOptions, NodesContext, NodesStoreFull } from 'src/utils/layout/NodesContext';
import type { NodeDataPluginSetState } from 'src/utils/layout/plugins/NodeDataPlugin';

export type ValidationsSelector = (
  nodeOrId: LayoutNode | string,
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden?: boolean, // Defaults to false
) => AnyValidation[];

export type LaxValidationsSelector = (
  nodeOrId: LayoutNode | string,
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden?: boolean, // Defaults to false
) => typeof ContextNotProvided | AnyValidation[];

export interface ValidationStorePluginConfig {
  extraFunctions: {
    setNodeVisibility: (nodes: LayoutNode[] | string[], newVisibility: number) => void;
    setAttachmentVisibility: (attachmentId: string, node: LayoutNode, newVisibility: number) => void;
  };
  extraHooks: {
    useSetNodeVisibility: () => ValidationStorePluginConfig['extraFunctions']['setNodeVisibility'];
    useLaxSetNodeVisibility: () =>
      | ValidationStorePluginConfig['extraFunctions']['setNodeVisibility']
      | typeof ContextNotProvided;
    useSetAttachmentVisibility: () => ValidationStorePluginConfig['extraFunctions']['setAttachmentVisibility'];
    useRawValidationVisibility: (node: LayoutNode | undefined) => number;
    useRawValidations: (node: LayoutNode | undefined) => AnyValidation[];
    useVisibleValidations: (node: LayoutNode | undefined, showAll?: boolean) => AnyValidation[];
    useVisibleValidationsDeep: (
      node: LayoutNode | undefined,
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
const hiddenOptions: IsHiddenOptions = { respectTracks: true };

export class ValidationStorePlugin extends NodeDataPlugin<ValidationStorePluginConfig> {
  extraFunctions(set: NodeDataPluginSetState) {
    const out: ValidationStorePluginConfig['extraFunctions'] = {
      setNodeVisibility: (nodes, newVisibility) => {
        set(
          nodesProduce((state) => {
            for (const node of nodes) {
              const nodeData = typeof node === 'string' ? state.nodeData[node] : state.nodeData[node.id];

              if (nodeData && 'validationVisibility' in nodeData && 'initialVisibility' in nodeData) {
                nodeData.validationVisibility = newVisibility | nodeData.initialVisibility;
              }
            }
          }),
        );
      },
      setAttachmentVisibility: (attachmentId, node, newVisibility) => {
        set(
          nodesProduce((state) => {
            const nodeData = state.nodeData[node.id];
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
      useRawValidationVisibility: (node) =>
        store.useSelector((state) => {
          if (!node) {
            return 0;
          }
          const nodeData = state.nodeData[node.id];
          if (!nodeData) {
            return 0;
          }
          return 'validationVisibility' in nodeData ? nodeData.validationVisibility : 0;
        }),
      useRawValidations: (node) =>
        store.useShallowSelector((state) => {
          if (!node) {
            return emptyArray;
          }
          const nodeData = state.nodeData[node.id];
          if (!nodeData) {
            return emptyArray;
          }
          const out = 'validations' in nodeData ? nodeData.validations : undefined;
          return out && out.length > 0 ? out : emptyArray;
        }),
      useVisibleValidations: (node, showAll) => {
        const lookups = useLayoutLookups();
        return store.useShallowSelector((state) => {
          if (!node) {
            return emptyArray;
          }
          return getValidations({
            state,
            id: node.id,
            baseId: node.baseId,
            mask: showAll ? 'showAll' : 'visible',
            lookups,
          });
        });
      },
      useVisibleValidationsDeep: (node, mask, includeSelf, restriction, severity) => {
        const lookups = useLayoutLookups();
        return store.useMemoSelector((state) => {
          if (!node) {
            return emptyArray;
          }
          return getRecursiveValidations({
            state,
            id: node.id,
            baseId: node.baseId,
            mask,
            severity,
            includeSelf,
            restriction,
            lookups,
          });
        });
      },
      useValidationsSelector: () => {
        const lookups = useLayoutLookups();
        return store.useDelayedSelector({
          mode: 'simple',
          selector:
            (
              nodeOrId: LayoutNode | string,
              mask: NodeVisibility,
              severity?: ValidationSeverity,
              includeHidden: boolean = false,
            ) =>
            (state: NodesContext) => {
              const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
              const { baseComponentId } = splitDashedKey(id);
              return getValidations({
                state,
                id,
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
            (
              nodeOrId: LayoutNode | string,
              mask: NodeVisibility,
              severity?: ValidationSeverity,
              includeHidden: boolean = false,
            ) =>
            (state: NodesContext) => {
              const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
              const { baseComponentId } = splitDashedKey(id);
              return getValidations({
                state,
                id,
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

  if (!includeHidden && lookups && isHidden(state, 'node', id, lookups, hiddenOptions)) {
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
  includeSelf: boolean;
  restriction?: number | undefined;
}

export function getRecursiveValidations(props: GetDeepValidationsProps): NodeRefValidation[] {
  const out: NodeRefValidation[] = [];

  if (props.includeSelf) {
    const nodeValidations = getValidations(props);
    for (const validation of nodeValidations) {
      out.push({ ...validation, nodeId: props.id, baseComponentId: props.baseId });
    }
  }

  const children = Object.values(props.state.nodeData)
    .filter(
      (nodeData) =>
        nodeData.parentId === props.id && (props.restriction === undefined || props.restriction === nodeData.rowIndex),
    )
    .map((nodeData) => nodeData.id);

  for (const id of children) {
    out.push(
      ...getRecursiveValidations({
        ...props,
        id,

        // Restriction and includeSelf should only be applied to the first level (not recursively)
        restriction: undefined,
        includeSelf: true,
      }),
    );
  }

  return out;
}
