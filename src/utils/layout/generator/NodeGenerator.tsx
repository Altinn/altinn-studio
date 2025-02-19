import React, { useCallback, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useAsRef } from 'src/hooks/useAsRef';
import { getComponentCapabilities, getComponentDef, getNodeConstructor } from 'src/layout';
import { NodesStateQueue } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorDebug } from 'src/utils/layout/generator/debug';
import { GeneratorInternal, GeneratorNodeProvider } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorData } from 'src/utils/layout/generator/GeneratorDataSources';
import { useGeneratorErrorBoundaryNodeRef } from 'src/utils/layout/generator/GeneratorErrorBoundary';
import {
  GeneratorCondition,
  GeneratorRunProvider,
  StageAddNodes,
  StageEvaluateExpressions,
  StageMarkHidden,
} from 'src/utils/layout/generator/GeneratorStages';
import { useEvalExpressionInGenerator } from 'src/utils/layout/generator/useEvalExpression';
import { NodePropertiesValidation } from 'src/utils/layout/generator/validation/NodePropertiesValidation';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { SimpleEval } from 'src/features/expressions';
import type { ExprConfig, ExprResolved, ExprValToActual, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { CompDef } from 'src/layout';
import type { FormComponentProps, SummarizableComponentProps } from 'src/layout/common.generated';
import type {
  CompExternal,
  CompExternalExact,
  CompIntermediate,
  CompIntermediateExact,
  CompInternal,
  CompTypes,
  ITextResourceBindings,
} from 'src/layout/layout';
import type { ExprResolver, NodeGeneratorProps } from 'src/layout/LayoutComponent';
import type { LayoutNode, LayoutNodeProps } from 'src/utils/layout/LayoutNode';
import type { StateFactoryProps } from 'src/utils/layout/types';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

/**
 * A node generator will always be rendered when a component is present in a layout, even if the component
 * normally is hidden, the user is on another page, or the component is not visible for some other reason.
 *
 * Its job is to use relevant data sources to evaluate expressions in the item/component configuration,
 * and update other states needed by the component to function. We do this so that the node hierarchy
 * can always be up-to-date, and so that we can implement effects for components that run even when the
 * component is not visible/rendered.
 */
export function NodeGenerator({ children, externalItem }: PropsWithChildren<NodeGeneratorProps>) {
  const intermediateItem = useIntermediateItem(externalItem) as CompIntermediateExact<CompTypes>;
  const node = useNewNode(intermediateItem) as LayoutNode;
  useGeneratorErrorBoundaryNodeRef().current = node;

  const commonProps: CommonProps<CompTypes> = { node, externalItem, intermediateItem };

  return (
    // Adding id as a key to make it easier to see which component is being rendered in the React DevTools
    <GeneratorRunProvider key={intermediateItem.id}>
      <GeneratorCondition
        stage={StageAddNodes}
        mustBeAdded='parent'
      >
        <AddRemoveNode {...commonProps} />
      </GeneratorCondition>
      <GeneratorCondition
        stage={StageMarkHidden}
        mustBeAdded='parent'
      >
        <MarkAsHidden {...commonProps} />
      </GeneratorCondition>
      <GeneratorCondition
        stage={StageEvaluateExpressions}
        mustBeAdded='all'
      >
        <ResolveExpressions {...commonProps} />
      </GeneratorCondition>
      <GeneratorNodeProvider
        parent={node}
        item={intermediateItem}
      >
        <GeneratorCondition
          stage={StageMarkHidden}
          mustBeAdded='parent'
        >
          <NodePropertiesValidation {...commonProps} />
        </GeneratorCondition>
        {children}
      </GeneratorNodeProvider>
    </GeneratorRunProvider>
  );
}

interface CommonProps<T extends CompTypes> {
  node: LayoutNode<T>;
  externalItem: CompExternalExact<T>;
  intermediateItem: CompIntermediateExact<T>;
}

function MarkAsHidden<T extends CompTypes>({ node, externalItem }: CommonProps<T>) {
  const hidden = useEvalExpressionInGenerator(ExprVal.Boolean, node, externalItem.hidden, false) ?? false;
  const isSet = NodesInternal.useNodeData(node, (data) => data.hidden === hidden);
  NodesStateQueue.useSetNodeProp({ node, prop: 'hidden', value: hidden }, !isSet);

  return null;
}

function AddRemoveNode<T extends CompTypes>({ node, intermediateItem }: CommonProps<T>) {
  const parent = GeneratorInternal.useParent()!;
  const depth = GeneratorInternal.useDepth();
  const rowIndex = GeneratorInternal.useRowIndex();
  const pageKey = GeneratorInternal.usePage()?.pageKey ?? '';
  const idMutators = GeneratorInternal.useIdMutators() ?? [];
  const layoutMap = GeneratorInternal.useLayoutMap();
  const isValid = GeneratorInternal.useIsValid();
  const getCapabilities = (type: CompTypes) => getComponentCapabilities(type);
  const stateFactoryProps = {
    item: intermediateItem,
    parent,
    parentId: parent instanceof BaseLayoutNode ? parent.id : undefined,
    depth,
    rowIndex,
    pageKey,
    idMutators,
    layoutMap,
    getCapabilities,
    isValid,
  } satisfies StateFactoryProps<T>;
  const isAdded = NodesInternal.useIsAdded(node);

  NodesStateQueue.useAddNode(
    {
      node,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      targetState: node.def.stateFactory(stateFactoryProps as any),
    },
    !isAdded,
  );

  NodesStateQueue.useRemoveNode({ node });

  return null;
}

function ResolveExpressions<T extends CompTypes>({ node, intermediateItem }: CommonProps<T>) {
  const resolverProps = useExpressionResolverProps(node, intermediateItem);

  const def = useDef(intermediateItem.type);
  const resolved = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (def as CompDef<T>).evalExpressions(resolverProps as any) as CompInternal<T>,
    [def, resolverProps],
  );

  const isSet = NodesInternal.useNodeData(node, (data) => {
    if (!data.item) {
      return false;
    }

    for (const key in resolved) {
      if (!deepEqual(data.item[key], resolved[key])) {
        return false;
      }
    }

    return true;
  });

  NodesStateQueue.useSetNodeProp({ node, prop: 'item', value: resolved, partial: true }, !isSet);

  return GeneratorDebug.displayState && <pre style={{ fontSize: '0.8em' }}>{JSON.stringify(resolved, null, 2)}</pre>;
}

/**
 * Creates props for the expression resolver that can be used to evaluate expressions in a component configuration.
 * These props are passed on to your component's `evalExpressions` method.
 */
export function useExpressionResolverProps<T extends CompTypes>(
  node: LayoutNode<T> | undefined,
  _item: CompIntermediateExact<T>,
  rowIndex?: number,
): ExprResolver<T> {
  const allDataSources = GeneratorData.useExpressionDataSources();
  const allDataSourcesAsRef = useAsRef(allDataSources);

  // The hidden property is handled elsewhere, and should never be passed to the item (and resolved as an
  // expression) which could be read. Try useIsHidden() or useIsHiddenSelector() if you need to know if a
  // component is hidden.
  const item = useMemo(() => {
    const { hidden: _hidden, ...rest } = _item;
    return rest;
  }, [_item]) as CompIntermediate<T>;

  const evalProto = useCallback(
    <T extends ExprVal>(
      type: T,
      expr: ExprValToActualOrExpr<T> | undefined,
      defaultValue: ExprValToActual<T>,
      dataSources?: Partial<ExpressionDataSources>,
    ) => {
      if (!node) {
        return defaultValue;
      }

      const errorIntroText = `Invalid expression for component '${node.baseId}'`;
      if (!ExprValidation.isValidOrScalar(expr, type, errorIntroText)) {
        return defaultValue;
      }

      const config: ExprConfig = {
        returnType: type,
        defaultValue,
      };

      return evalExpr(expr, node, { ...allDataSourcesAsRef.current, ...dataSources }, { config, errorIntroText });
    },
    [allDataSourcesAsRef, node],
  );

  const evalBool = useCallback<SimpleEval<ExprVal.Boolean>>(
    (expr, defaultValue, dataSources) => evalProto(ExprVal.Boolean, expr, defaultValue, dataSources),
    [evalProto],
  );

  const evalStr = useCallback<SimpleEval<ExprVal.String>>(
    (expr, defaultValue, dataSources) => evalProto(ExprVal.String, expr, defaultValue, dataSources),
    [evalProto],
  );

  const evalNum = useCallback<SimpleEval<ExprVal.Number>>(
    (expr, defaultValue, dataSources) => evalProto(ExprVal.Number, expr, defaultValue, dataSources),
    [evalProto],
  );

  const evalAny = useCallback<SimpleEval<ExprVal.Any>>(
    (expr, defaultValue, dataSources) => evalProto(ExprVal.Any, expr, defaultValue, dataSources),
    [evalProto],
  );

  // This resolves common expressions that are used by multiple components
  // and are not specific to a single component type.
  const evalBase = useCallback<ExprResolver<T>['evalBase']>(() => {
    const { hidden: _hidden, ...rest } = item;
    return {
      ...rest,
      ...(rest.pageBreak
        ? {
            pageBreak: {
              breakBefore: evalStr(rest.pageBreak.breakBefore, 'auto'),
              breakAfter: evalStr(rest.pageBreak.breakAfter, 'auto'),
            },
          }
        : {}),
    };
  }, [evalStr, item]);

  const evalFormProps = useCallback<ExprResolver<T>['evalFormProps']>(() => {
    const out: ExprResolved<FormComponentProps> = {};
    if (isFormItem(item)) {
      if (Array.isArray(item.required)) {
        out.required = evalBool(item.required, false);
      }
      if (Array.isArray(item.readOnly)) {
        out.readOnly = evalBool(item.readOnly, false);
      }
    }

    return out;
  }, [evalBool, item]);

  const evalSummarizable = useCallback<ExprResolver<T>['evalSummarizable']>(() => {
    const out: ExprResolved<SummarizableComponentProps> = {};
    if (isSummarizableItem(item) && Array.isArray(item.forceShowInSummary)) {
      out.forceShowInSummary = evalBool(item.forceShowInSummary, false);
    }

    return out;
  }, [evalBool, item]);

  // This resolves all text resource bindings in a component
  const evalTrb = useCallback<ExprResolver<T>['evalTrb']>(() => {
    const trb: Record<string, string> = {};
    if (item.textResourceBindings) {
      for (const [key, value] of Object.entries(item.textResourceBindings)) {
        trb[key] = evalStr(value, '');
      }
    }

    return {
      textResourceBindings: (item.textResourceBindings ? trb : undefined) as ExprResolved<ITextResourceBindings<T>>,
    };
  }, [evalStr, item]);

  return {
    item,
    rowIndex,
    evalBool,
    evalNum,
    evalStr,
    evalAny,
    evalBase,
    evalFormProps,
    evalSummarizable,
    evalTrb,
    formDataSelector: allDataSources.formDataSelector,
  };
}

function useIntermediateItem<T extends CompTypes = CompTypes>(item: CompExternal<T>): CompIntermediate<T> {
  const directMutators = GeneratorInternal.useDirectMutators();
  const recursiveMutators = GeneratorInternal.useRecursiveMutators();

  return useMemo(() => {
    const newItem = structuredClone(item) as CompIntermediate<T>;

    for (const mutator of directMutators) {
      mutator(newItem);
    }
    for (const mutator of recursiveMutators) {
      mutator(newItem);
    }

    return newItem;
  }, [directMutators, item, recursiveMutators]);
}

/**
 * Creates a new node instance for a component item, and adds that to the parent node and the store.
 */
function useNewNode<T extends CompTypes>(item: CompIntermediate<T>): LayoutNode<T> {
  const parent = GeneratorInternal.useParent()!;
  const rowIndex = GeneratorInternal.useRowIndex();
  const LNode = useNodeConstructor(item.type);

  return useMemo(() => {
    const newNodeProps: LayoutNodeProps<T> = { item, parent, rowIndex };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new LNode(newNodeProps as any) as LayoutNode<T>;
  }, [LNode, item, parent, rowIndex]);
}

function isFormItem(item: CompIntermediate): item is CompIntermediate & FormComponentProps {
  return 'readOnly' in item || 'required' in item || 'showValidations' in item;
}

function isSummarizableItem(item: CompIntermediate): item is CompIntermediate & SummarizableComponentProps {
  return 'renderAsSummary' in item;
}

export function useDef<T extends CompTypes>(type: T) {
  const def = getComponentDef<T>(type)!;
  if (!def) {
    throw new Error(`Component type "${type}" not found`);
  }

  return def;
}

function useNodeConstructor<T extends CompTypes>(type: T) {
  const LNode = getNodeConstructor(type);
  if (!LNode) {
    throw new Error(`Component type "${type}" not found`);
  }

  return LNode;
}
