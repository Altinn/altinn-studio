import { useCallback } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation/index';
import { getInitialMaskFromNodeItem, selectValidations } from 'src/features/validation/utils';
import { isHidden, nodesProduce, useNodesLax } from 'src/utils/layout/NodesContext';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import { TraversalTask } from 'src/utils/layout/useNodeTraversal';
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
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

export type ValidationsSelector = (
  node: LayoutNode,
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden?: boolean, // Defaults to false
) => AnyValidation[];

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
      restriction?: TraversalRestriction,
      severity?: ValidationSeverity,
    ) => NodeRefValidation[];
    useValidationsSelector: () => ValidationsSelector;
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
              const initialMask = getInitialMaskFromNodeItem(nodeData.layout);

              if (nodeData && 'validationVisibility' in nodeData) {
                nodeData.validationVisibility = newVisibility | initialMask;
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
      useVisibleValidations: (node, showAll) =>
        store.useShallowSelector((state) => {
          if (!node) {
            return emptyArray;
          }
          return getValidations({ state, node, mask: showAll ? 'showAll' : 'visible' });
        }),
      useVisibleValidationsDeep: (node, mask, includeSelf, restriction, severity) =>
        store.useMemoSelector((state) => {
          if (!node) {
            return emptyArray;
          }
          return getRecursiveValidations({ state, node, mask, severity, includeSelf, restriction });
        }),
      useValidationsSelector: () =>
        store.useDelayedSelector({
          mode: 'simple',
          selector:
            (node: LayoutNode, mask: NodeVisibility, severity?: ValidationSeverity, includeHidden: boolean = false) =>
            (state: NodesContext) =>
              getValidations({ state, node, mask, severity, includeHidden }),
        }) satisfies ValidationsSelector,
      useAllValidations: (mask, severity, includeHidden) => {
        const nodes = useNodesLax();
        return store.useLaxMemoSelector((state) => {
          const out: NodeRefValidation[] = [];
          for (const node of nodes?.allNodes() ?? []) {
            const validations = getValidations({ state, node, mask, severity, includeHidden });
            for (const validation of validations) {
              out.push({ ...validation, nodeId: node.id });
            }
          }

          return out;
        });
      },
      useGetNodesWithErrors: () => {
        const zustand = store.useLaxStore();
        const nodes = useNodesLax();
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
            for (const node of nodes?.allNodes() ?? []) {
              const validations = getValidations({ state, node, mask, severity, includeHidden });
              if (validations.length > 0) {
                outNodes.push(node.id);
                outValidations.push(...validations);
              }
            }
            return [outNodes, outValidations];
          },
          [nodes, zustand],
        );
      },
      usePageHasVisibleRequiredValidations: (pageKey) => {
        const nodes = useNodesLax();
        return store.useSelector((state) => {
          if (!pageKey) {
            return false;
          }

          for (const node of nodes?.allNodes() ?? []) {
            const nodeData = state.nodeData[node.id];
            if (!nodeData || nodeData.pageKey !== pageKey) {
              continue;
            }

            const validations = getValidations({ state, node, mask: 'visible', severity: 'error' });
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
  node: LayoutNode;
  mask: NodeVisibility;
  severity?: ValidationSeverity;
  includeHidden?: boolean;
}

function getValidations({ state, node, mask, severity, includeHidden = false }: GetValidationsProps): AnyValidation[] {
  const nodeData = state.nodeData[node.id];
  if (!nodeData || !('validations' in nodeData) || !('validationVisibility' in nodeData)) {
    return emptyArray;
  }

  const nodes = node.page.layoutSet;
  if (!includeHidden && (!node || isHidden(state, node, nodes, hiddenOptions))) {
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
  restriction?: TraversalRestriction;
}

function getRecursiveValidations(props: GetDeepValidationsProps): NodeRefValidation[] {
  const out: NodeRefValidation[] = [];

  if (props.includeSelf) {
    const nodeValidations = getValidations(props);
    for (const validation of nodeValidations) {
      out.push({ ...validation, nodeId: props.node.id });
    }
  }

  const nodes = props.node.page.layoutSet;
  if (nodes) {
    const children = props.node.children(new TraversalTask(props.state, nodes, undefined, props.restriction));
    for (const child of children) {
      out.push(
        ...getRecursiveValidations({
          ...props,
          node: child,

          // Restriction and includeSelf should only be applied to the first level (not recursively)
          restriction: undefined,
          includeSelf: true,
        }),
      );
    }
  }

  return out;
}
