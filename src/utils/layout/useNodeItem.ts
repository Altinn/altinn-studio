import { FD } from 'src/features/formData/FormDataWrite';
import { getComponentDef } from 'src/layout';
import { useCurrentDataModelLocation } from 'src/utils/layout/DataModelLocation';
import { useExpressionResolverProps } from 'src/utils/layout/generator/NodeGenerator';
import { useDataModelBindingsFor, useIntermediateItem } from 'src/utils/layout/hooks';
import { NodesInternal, useNodes } from 'src/utils/layout/NodesContext';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import { typedBoolean } from 'src/utils/typing';
import type { FormDataSelector } from 'src/layout';
import type { CompInternal, CompTypes, IDataModelBindings, TypeFromNode } from 'src/layout/layout';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * This evaluates all expressions for a given component configuration. If the type is not correct, things will crash.
 * @see useNodeItemIfType Use this one if you only want to evaluate expressions _if_ the type is the expected one.
 */
export function useItemWhenType<T extends CompTypes>(
  baseComponentId: string,
  type: T | ((type: CompTypes) => boolean),
): CompInternal<T> {
  const intermediate = useIntermediateItem(baseComponentId);
  if (
    !intermediate ||
    (typeof type === 'string' && intermediate.type !== type) ||
    (typeof type === 'function' && !type(intermediate.type))
  ) {
    const suffix = typeof type === 'string' ? ` (expected ${type})` : '';
    throw new Error(`Unexpected type for ${baseComponentId}: ${intermediate?.type}${suffix}`);
  }
  const location = useCurrentDataModelLocation();
  const dataSources = useExpressionDataSources(intermediate, { dataSources: { currentDataModelPath: () => location } });
  const props = useExpressionResolverProps(`Invalid expression for ${baseComponentId}`, intermediate, dataSources);
  const def = getComponentDef(intermediate.type);
  return def.evalExpressions(props as never) as CompInternal<T>;
}

/**
 * This evaluates all expressions for a given component configuration, but only when the
 * target component is the given type.
 * @see useItemWhenType
 * @see useItemFor
 */
export function useItemIfType<T extends CompTypes>(
  baseComponentId: string,
  type: T | ((type: CompTypes) => boolean),
): CompInternal<T> | undefined {
  const intermediate = useIntermediateItem(baseComponentId);
  if (
    !intermediate ||
    (typeof type === 'string' && intermediate.type !== type) ||
    (typeof type === 'function' && !type(intermediate.type))
  ) {
    return undefined;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const location = useCurrentDataModelLocation();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dataSources = useExpressionDataSources(intermediate, { dataSources: { currentDataModelPath: () => location } });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const props = useExpressionResolverProps(`Invalid expression for ${baseComponentId}`, intermediate, dataSources);
  const def = getComponentDef(intermediate.type);
  return def.evalExpressions(props as never) as CompInternal<T>;
}

/**
 * This evaluates all expressions for a given component configuration. This should only be used when you don't know
 * the target component type beforehand.
 * @see useItemWhenType
 * @see useItemIfType
 */
export function useItemFor<T extends CompTypes = CompTypes>(baseComponentId: string): CompInternal<T> {
  const intermediate = useIntermediateItem(baseComponentId);
  if (!intermediate) {
    throw new Error(`No component configuration found for ${baseComponentId}`);
  }
  const location = useCurrentDataModelLocation();
  const dataSources = useExpressionDataSources(intermediate, { dataSources: { currentDataModelPath: () => location } });
  const props = useExpressionResolverProps(`Invalid expression for ${baseComponentId}`, intermediate, dataSources);
  const def = getComponentDef(intermediate.type);
  return def.evalExpressions(props as never) as CompInternal<T>;
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
export function useNodeFormData<N extends LayoutNode>(node: N): NodeFormData<N> {
  const dataModelBindings = useDataModelBindingsFor(node.baseId) as IDataModelBindings<TypeFromNode<N>>;
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
