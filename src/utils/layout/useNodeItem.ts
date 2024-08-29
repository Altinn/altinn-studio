import { useCallback, useMemo } from 'react';
import type { MutableRefObject } from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { typedBoolean } from 'src/utils/typing';
import type { WaitForState } from 'src/hooks/useWaitForState';
import type { FormDataSelector } from 'src/layout';
import type { CompInternal, CompTypes, IDataModelBindings, TypeFromNode } from 'src/layout/layout';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeData, NodeItemFromNode } from 'src/utils/layout/types';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

/**
 * Use the item of a node. This re-renders when the item changes (or when the part of the item you select changes),
 * which doesn't happen if you use node.item directly.
 */
export function useNodeItem<N extends LayoutNode | undefined, Out>(
  node: N,
  selector: (item: NodeItemFromNode<N>) => Out,
): N extends undefined ? undefined : Out;
// eslint-disable-next-line no-redeclare
export function useNodeItem<N extends LayoutNode | undefined>(
  node: N,
  selector?: undefined,
): N extends undefined ? undefined : NodeItemFromNode<N>;
// eslint-disable-next-line no-redeclare
export function useNodeItem(node: never, selector: never): never {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NodesInternal.useNodeData(node, (data: NodeData) => (selector ? (selector as any)(data.item) : data.item));
}

export function useNodeItemRef<N extends LayoutNode | undefined, Out>(
  node: N,
  selector: (item: NodeItemFromNode<N>) => Out,
): MutableRefObject<Out>;
// eslint-disable-next-line no-redeclare
export function useNodeItemRef<N extends LayoutNode | undefined>(
  node: N,
  selector?: undefined,
): MutableRefObject<NodeItemFromNode<N>>;
// eslint-disable-next-line no-redeclare
export function useNodeItemRef(node: never, selector: never): never {
  return NodesInternal.useNodeDataRef(node, (node: NodeData) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selector ? (selector as any)(node.item) : node.item,
  ) as never;
}

const selectNodeItem = <T extends CompTypes>(data: NodeData<T>): CompInternal<T> | undefined =>
  data.item as CompInternal<T>;
export function useWaitForNodeItem<RetVal, N extends LayoutNode | undefined>(
  node: N,
): WaitForState<NodeItemFromNode<N> | undefined, RetVal> {
  return NodesInternal.useWaitForNodeData(node, selectNodeItem) as WaitForState<
    NodeItemFromNode<N> | undefined,
    RetVal
  >;
}

const emptyArray: LayoutNode[] = [];
export function useNodeDirectChildren(parent: LayoutNode, restriction?: TraversalRestriction): LayoutNode[] {
  return (
    NodesInternal.useNodeData(parent, (store) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parent.def.pickDirectChildren(store as any, restriction).filter(typedBoolean),
    ) ?? emptyArray
  );
}

type NodeFormData<N extends LayoutNode | undefined> = N extends undefined
  ? IComponentFormData<TypeFromNode<Exclude<N, undefined>>> | undefined
  : IComponentFormData<TypeFromNode<Exclude<N, undefined>>>;

const emptyObject = {};
export function useNodeFormData<N extends LayoutNode | undefined>(node: N): NodeFormData<N> {
  const dataModelBindings = useNodeItem(node, (i) => i?.dataModelBindings);
  const formDataSelector = FD.useDebouncedSelector();

  return useMemo(
    () => (dataModelBindings ? getNodeFormData(dataModelBindings, formDataSelector) : emptyObject) as NodeFormData<N>,
    [dataModelBindings, formDataSelector],
  );
}

export type NodeFormDataSelector = ReturnType<typeof useNodeFormDataSelector>;
export function useNodeFormDataSelector() {
  const nodeSelector = NodesInternal.useNodeDataSelector();
  const formDataSelector = FD.useDebouncedSelector();

  return useCallback(
    <N extends LayoutNode | undefined>(node: N): NodeFormData<N> => {
      const dataModelBindings = nodeSelector((picker) => picker(node)?.layout.dataModelBindings, [node]);
      return dataModelBindings
        ? (getNodeFormData(dataModelBindings, formDataSelector) as NodeFormData<N>)
        : (emptyObject as NodeFormData<N>);
    },
    [nodeSelector, formDataSelector],
  );
}

function getNodeFormData<N extends LayoutNode>(
  dataModelBindings: IDataModelBindings<TypeFromNode<N>>,
  formDataSelector: FormDataSelector,
): NodeFormData<N> {
  if (!dataModelBindings) {
    return emptyObject as NodeFormData<N>;
  }

  const formDataObj: { [key: string]: unknown } = {};
  for (const key of Object.keys(dataModelBindings)) {
    const binding = dataModelBindings[key];
    const data = formDataSelector(binding);

    if (key === 'list') {
      formDataObj[key] = data ?? [];
    } else if (key === 'simpleBinding') {
      formDataObj[key] = data != null ? String(data) : '';
    } else {
      formDataObj[key] = data;
    }
  }

  return formDataObj as NodeFormData<N>;
}
