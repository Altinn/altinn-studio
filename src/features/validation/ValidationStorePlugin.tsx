import { useCallback } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation/index';
import { getInitialMaskFromNodeItem, selectValidations } from 'src/features/validation/utils';
import { Hidden, isHidden, nodesProduce } from 'src/utils/layout/NodesContext';
import { NodeDataPlugin } from 'src/utils/layout/plugins/NodeDataPlugin';
import { TraversalTask } from 'src/utils/layout/useNodeTraversal';
import type {
  AnyValidation,
  AttachmentValidation,
  NodeRefValidation,
  NodeVisibility,
  ValidationSeverity,
  ValidationsProcessedLast,
} from 'src/features/validation/index';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IsHiddenOptions, NodesContext, NodesStoreFull } from 'src/utils/layout/NodesContext';
import type { NodeDataPluginSetState } from 'src/utils/layout/plugins/NodeDataPlugin';
import type { NodeData } from 'src/utils/layout/types';

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
    useValidationsProcessedLast: (node: LayoutNode | undefined) => ValidationsProcessedLast | undefined;
    useVisibleValidations: (node: LayoutNode | undefined, showAll?: boolean) => AnyValidation[];
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
              const initialMask = getInitialMaskFromNodeItem(nodeData.item);

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
      useValidationsProcessedLast: (node) =>
        store.useSelector((state) => {
          if (!node) {
            return;
          }
          const nodeData = state.nodeData[node.id];
          if (!nodeData) {
            return;
          }
          return 'validationsProcessedLast' in nodeData ? nodeData.validationsProcessedLast : undefined;
        }),
      useRawValidations: (node) =>
        store.useSelector((state) => {
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
        const isHidden = Hidden.useIsHidden(node);
        return store.useSelector((state) => {
          if (!node || isHidden) {
            return emptyArray;
          }
          const nodeData = state.nodeData[node.id];
          return getValidations({ state, nodeData, mask: showAll ? 'showAll' : 'visible' });
        });
      },
      useValidationsSelector: () =>
        store.useDelayedSelector({
          mode: 'simple',
          selector:
            (node: LayoutNode, mask: NodeVisibility, severity?: ValidationSeverity, includeHidden: boolean = false) =>
            (state: NodesContext) => {
              const nodeData = state.nodeData[node.id];
              return getValidations({ state, nodeData, mask, severity, includeHidden });
            },
        }) satisfies ValidationsSelector,
      useAllValidations: (mask, severity, includeHidden) =>
        store.useLaxMemoSelector((state) => {
          const out: NodeRefValidation[] = [];
          for (const nodeId of Object.keys(state.nodeData)) {
            const nodeData = state.nodeData[nodeId];
            const validations = getValidations({ state, nodeData, mask, severity, includeHidden });
            for (const validation of validations) {
              out.push({ ...validation, nodeId });
            }
          }

          return out;
        }),
      useGetNodesWithErrors: () => {
        const zustand = store.useLaxStore();
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
            for (const nodeId of Object.keys(state.nodeData)) {
              const nodeData = state.nodeData[nodeId];

              const validations = getValidations({ state, nodeData, mask, severity, includeHidden });
              if (validations.length > 0) {
                outNodes.push(nodeId);
                outValidations.push(...validations);
              }
            }
            return [outNodes, outValidations];
          },
          [zustand],
        );
      },
      usePageHasVisibleRequiredValidations: (pageKey) =>
        store.useSelector((state) => {
          if (!pageKey) {
            return false;
          }

          for (const nodeId of Object.keys(state.nodeData)) {
            const nodeData = state.nodeData[nodeId];
            if (!nodeData || nodeData.pageKey !== pageKey) {
              continue;
            }

            const validations = getValidations({ state, nodeData, mask: 'visible', severity: 'error' });
            for (const validation of validations) {
              if (validation.source === FrontendValidationSource.EmptyField) {
                return true;
              }
            }
          }

          return false;
        }),
    };
  }
}

function getNodeFromState(state: NodesContext, nodeId: string): LayoutNode | undefined {
  if (state.nodes) {
    return state.nodes.findById(new TraversalTask(state, state.nodes, undefined, undefined), nodeId);
  }
  return undefined;
}

interface GetValidationsProps {
  state: NodesContext;
  nodeData: NodeData | undefined;
  mask: NodeVisibility;
  severity?: ValidationSeverity;
  includeHidden?: boolean;
}

function getValidations({
  state,
  nodeData,
  mask,
  severity,
  includeHidden = false,
}: GetValidationsProps): AnyValidation[] {
  if (!nodeData || !('validations' in nodeData) || !('validationVisibility' in nodeData)) {
    return emptyArray;
  }

  const node = getNodeFromState(state, nodeData.layout.id);
  if (!includeHidden && (!node || isHidden(state, node, hiddenOptions))) {
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
