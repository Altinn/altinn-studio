import { useCallback, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { NodesInternal, NodesReadiness } from 'src/utils/layout/NodesContext';
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
  const lastItem = useRef<CompInternal | undefined>(undefined);
  const insideGenerator = GeneratorInternal.useIsInsideGenerator();
  return NodesInternal.useNodeData(node, (data: NodeData, readiness) => {
    if (insideGenerator) {
      throw new Error(
        'useNodeItem() should not be used inside the node generator, it would most likely just crash when ' +
          'the item is undefined. Instead, use GeneratorInternal.useIntermediateItem() to get the item before ' +
          'expressions have run, or use a more specific selector in NodesInternal.useNodeData() which will ' +
          'make you handle the undefined item.',
      );
    }

    let item: CompInternal | undefined;
    if (readiness === NodesReadiness.Ready && data.item) {
      item = data.item;
      lastItem.current = item;
    } else if (lastItem.current) {
      item = lastItem.current;
    } else {
      // This is possibly stale state, or in the process of being updated, but it's better than failing hard.
      item = data.item;
    }

    if (!item) {
      throw new Error(
        `Node item is undefined. This should normally not happen, but might happen if you select data in new ` +
          `components while the node state is in the process of being updated (readiness is '${readiness}'). `,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return selector ? (selector as any)(item) : item;
  });
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
  const insideGenerator = GeneratorInternal.useIsInsideGenerator();
  const lastValue = useRef<LayoutNode[] | undefined>(undefined);
  return NodesInternal.useNodeData(parent, (nodeData, readiness, fullState) => {
    if (readiness !== NodesReadiness.Ready && !insideGenerator && lastValue.current) {
      return lastValue.current;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = parent.def.pickDirectChildren(nodeData as any, restriction);
    if (!insideGenerator) {
      // If we're not inside the generator, we should make sure to only return values that make sense.
      for (const child of out) {
        if (!child) {
          // At least one child is undefined, meaning we're in the process of adding/removing nodes. Better to return
          // none than return a broken-up set of children.
          return emptyArray;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const childNodeData = fullState.nodeData[child.id] as any;
        if (
          !childNodeData ||
          !child.def.stateIsReady(childNodeData) ||
          !child.def.pluginStateIsReady(childNodeData, fullState)
        ) {
          // At least one child is not ready, so rendering these out would be worse than pretending there are none.
          return emptyArray;
        }
      }
    }

    lastValue.current = out;
    return out ?? emptyArray;
  });
}

type NodeFormData<N extends LayoutNode | undefined> = N extends undefined
  ? IComponentFormData<TypeFromNode<Exclude<N, undefined>>> | undefined
  : IComponentFormData<TypeFromNode<Exclude<N, undefined>>>;

const emptyObject = {};
export function useNodeFormData<N extends LayoutNode | undefined>(node: N): NodeFormData<N> {
  const dataModelBindings = NodesInternal.useNodeData(node, (data) => data.layout.dataModelBindings);
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
