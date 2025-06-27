import { FD } from 'src/features/formData/FormDataWrite';
import { getComponentDef } from 'src/layout';
import { useDataModelLocationForNode } from 'src/utils/layout/DataModelLocation';
import { useExpressionResolverProps } from 'src/utils/layout/generator/NodeGenerator';
import { useDataModelBindingsFor, useIntermediateItem } from 'src/utils/layout/hooks';
import { NodesInternal, useNodes } from 'src/utils/layout/NodesContext';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import { typedBoolean } from 'src/utils/typing';
import type { FormDataSelector } from 'src/layout';
import type { CompInternal, CompTypes, IDataModelBindings, TypeFromNode } from 'src/layout/layout';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeItemFromNode } from 'src/utils/layout/types';

/**
 * Use the item of a node. This re-renders when the item changes (or when the part of the item you select changes),
 * which doesn't happen if you use node.item directly.
 */
export function useNodeItem<N extends LayoutNode, Out>(node: N, selector: (item: NodeItemFromNode<N>) => Out): Out;
// eslint-disable-next-line no-redeclare
export function useNodeItem<N extends LayoutNode>(node: N, selector?: undefined): NodeItemFromNode<N>;
// eslint-disable-next-line no-redeclare
export function useNodeItem(node: LayoutNode, selector: never): unknown {
  const intermediate = useIntermediateItem(node.baseId);
  const location = useDataModelLocationForNode(node.id);
  const dataSources = useExpressionDataSources(intermediate, { dataSources: { currentDataModelPath: () => location } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = useExpressionResolverProps(`Invalid expression for ${node?.id}`, intermediate, dataSources) as any;
  const resolved = node?.def.evalExpressions(props);

  if (!resolved) {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return selector ? (selector as any)(resolved) : resolved;
}

export function useNodeItemWhenType<T extends CompTypes>(nodeId: string, type: T): CompInternal<T> {
  const { baseComponentId } = nodeId ? splitDashedKey(nodeId) : { baseComponentId: undefined };
  const intermediate = useIntermediateItem(baseComponentId);
  const location = useDataModelLocationForNode(nodeId);
  const dataSources = useExpressionDataSources(intermediate, { dataSources: { currentDataModelPath: () => location } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = useExpressionResolverProps(`Invalid expression for ${nodeId}`, intermediate, dataSources) as any;
  const def = getComponentDef(type);
  return def.evalExpressions(props) as CompInternal<T>;
}

const emptyArray: LayoutNode[] = [];
export function useNodeDirectChildren(parent: LayoutNode | undefined, restriction?: number | undefined): LayoutNode[] {
  const nodes = useNodes();
  return (
    NodesInternal.useMemoSelector((state) => {
      if (!parent) {
        return emptyArray;
      }

      const out: (LayoutNode | undefined)[] = [];
      for (const n of Object.values(state.nodeData)) {
        if (n.parentId === parent.id && (restriction === undefined || restriction === n.rowIndex)) {
          out.push(nodes.findById(n.id));
        }
      }
      return out.filter(typedBoolean);
    }) ?? emptyArray
  );
}

type NodeFormData<N extends LayoutNode | undefined> = N extends undefined
  ? IComponentFormData<TypeFromNode<Exclude<N, undefined>>> | undefined
  : IComponentFormData<TypeFromNode<Exclude<N, undefined>>>;

const emptyObject = {};
export function useNodeFormData<N extends LayoutNode | undefined>(node: N): NodeFormData<N> {
  const dataModelBindings = useDataModelBindingsFor(node?.baseId) as IDataModelBindings<TypeFromNode<N>> | undefined;
  return FD.useDebouncedSelect((pick) => getNodeFormDataInner(dataModelBindings, pick)) as NodeFormData<N>;
}

export function useNodeFormDataWhenType<Type extends CompTypes>(
  baseComponentId: string,
  type: Type,
): IComponentFormData<Type> | undefined {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, type) as IDataModelBindings<Type> | undefined;
  return FD.useDebouncedSelect((pick) => getNodeFormDataInner(dataModelBindings, pick));
}

function getNodeFormDataInner<T extends CompTypes>(
  dataModelBindings: IDataModelBindings<T> | undefined,
  formDataSelector: FormDataSelector,
): IComponentFormData<T> {
  if (!dataModelBindings) {
    return emptyObject as IComponentFormData<T>;
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

  return formDataObj as IComponentFormData<T>;
}
