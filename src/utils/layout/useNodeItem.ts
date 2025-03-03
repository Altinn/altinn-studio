import { useMemo } from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { typedBoolean } from 'src/utils/typing';
import type { WaitForState } from 'src/hooks/useWaitForState';
import type { FormDataSelector } from 'src/layout';
import type { CompInternal, CompTypes, IDataModelBindings, TypeFromNode } from 'src/layout/layout';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';
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
export function useNodeItem(node: LayoutNode | undefined, selector: never): unknown {
  if (GeneratorInternal.useIsInsideGenerator()) {
    throw new Error(
      'useNodeItem() should not be used inside the node generator, it would most likely just crash when ' +
        'the item is undefined. Instead, use GeneratorInternal.useIntermediateItem() to get the item before ' +
        'expressions have run, or use a more specific selector in NodesInternal.useNodeData() which will ' +
        'make you handle the undefined item.',
    );
  }

  return NodesInternal.useNodeData(node, (data: NodeData, readiness) => {
    if (!data?.item) {
      throw new Error(
        `Node item for '${node?.id}' is undefined. This should normally not happen, but might happen if you ` +
          `select data in new components while the node state is in the process of being updated ` +
          `(readiness is '${readiness}'). `,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return selector ? (selector as any)(data.item) : data.item;
  });
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
export function useNodeDirectChildren(
  parent: LayoutNode | undefined,
  restriction?: TraversalRestriction,
): LayoutNode[] {
  return (
    NodesInternal.useNodeData(parent, (nodeData) => {
      if (!parent) {
        return emptyArray;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out = parent.def.pickDirectChildren(nodeData as any, restriction);
      const nodes = parent.page.layoutSet;
      return out?.map((id) => nodes.findById(id)).filter(typedBoolean);
    }) ?? emptyArray
  );
}

type NodeFormData<N extends LayoutNode | undefined> = N extends undefined
  ? IComponentFormData<TypeFromNode<Exclude<N, undefined>>> | undefined
  : IComponentFormData<TypeFromNode<Exclude<N, undefined>>>;

const emptyObject = {};
export function useNodeFormData<N extends LayoutNode | undefined>(node: N): NodeFormData<N> {
  const dataModelBindings = NodesInternal.useNodeData(node, (data) => data.layout.dataModelBindings);
  const formDataSelector = FD.useDebouncedSelector();

  return useMemo(
    () =>
      (dataModelBindings ? getNodeFormDataInner(dataModelBindings, formDataSelector) : emptyObject) as NodeFormData<N>,
    [dataModelBindings, formDataSelector],
  );
}

function getNodeFormDataInner<N extends LayoutNode>(
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

export function getNodeFormData<Type extends CompTypes = CompTypes>(
  nodeId: string,
  nodeDataSelector: NodeDataSelector,
  formDataSelector: FormDataSelector,
): IComponentFormData<Type> | undefined {
  const dataModelBindings = nodeDataSelector((picker) => picker(nodeId)?.layout.dataModelBindings, [nodeId]);
  return dataModelBindings
    ? (getNodeFormDataInner(dataModelBindings, formDataSelector) as IComponentFormData<Type>)
    : undefined;
}
