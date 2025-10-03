import React, { useCallback, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { getComponentCapabilities, getComponentDef } from 'src/layout';
import { GeneratorInternal, GeneratorNodeProvider } from 'src/utils/layout/generator/GeneratorContext';
import { useGeneratorErrorBoundaryNodeRef } from 'src/utils/layout/generator/GeneratorErrorBoundary';
import { WhenParentAdded } from 'src/utils/layout/generator/GeneratorStages';
import { NodePropertiesValidation } from 'src/utils/layout/generator/validation/NodePropertiesValidation';
import { NodesInternal, NodesStore } from 'src/utils/layout/NodesContext';
import type { SimpleEval } from 'src/features/expressions';
import type { ExprResolved, ExprValToActual, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { FormComponentProps, SummarizableComponentProps } from 'src/layout/common.generated';
import type {
  CompExternal,
  CompExternalExact,
  CompIntermediate,
  CompIntermediateExact,
  CompTypes,
  ITextResourceBindings,
} from 'src/layout/layout';
import type { ExprResolver, NodeGeneratorProps } from 'src/layout/LayoutComponent';
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

  // eslint-disable-next-line react-compiler/react-compiler
  useGeneratorErrorBoundaryNodeRef().current = { type: 'node', id: intermediateItem.id };

  const commonProps: CommonProps<CompTypes> = { baseComponentId: externalItem.id, externalItem };

  return (
    <>
      <WhenParentAdded>
        <AddRemoveNode
          {...commonProps}
          intermediateItem={intermediateItem}
        />
      </WhenParentAdded>
      <GeneratorNodeProvider
        parentBaseId={externalItem.id}
        item={intermediateItem}
      >
        <WhenParentAdded>
          <NodePropertiesValidation
            {...commonProps}
            intermediateItem={intermediateItem}
          />
        </WhenParentAdded>
        {children}
      </GeneratorNodeProvider>
    </>
  );
}

interface CommonProps<T extends CompTypes> {
  baseComponentId: string;
  externalItem: CompExternalExact<T>;
}

function AddRemoveNode<T extends CompTypes>({
  baseComponentId,
  intermediateItem,
}: CommonProps<T> & { intermediateItem: CompIntermediateExact<T> }) {
  const parent = GeneratorInternal.useParent();
  const depth = GeneratorInternal.useDepth();
  const rowIndex = GeneratorInternal.useRowIndex();
  const pageKey = GeneratorInternal.usePage() ?? '';
  console.log('NodeGenerator depth:', { baseComponentId, depth, depthType: typeof depth });
  const idMutators = GeneratorInternal.useIdMutators();
  const layoutMap = useLayoutLookups().allComponents;
  const isValid = GeneratorInternal.useIsValid();
  const getCapabilities = useCallback((type: CompTypes) => getComponentCapabilities(type), []);
  const stateFactoryProps = useMemo(
    () =>
      ({
        id: intermediateItem.id,
        baseId: baseComponentId,
        parentId: parent?.type === 'node' ? parent.indexedId : undefined,
        depth,
        rowIndex,
        pageKey,
        idMutators,
        layoutMap,
        getCapabilities,
        isValid,
        dataModelBindings: intermediateItem.dataModelBindings as never,
      }) satisfies StateFactoryProps,
    [
      baseComponentId,
      depth,
      getCapabilities,
      idMutators,
      intermediateItem.dataModelBindings,
      intermediateItem.id,
      isValid,
      layoutMap,
      pageKey,
      parent.indexedId,
      parent?.type,
      rowIndex,
    ],
  );

  const isAdded = NodesInternal.useIsAdded(intermediateItem.id, 'node');

  const def = getComponentDef(intermediateItem.type);
  const addNode = GeneratorInternal.useAddNode();
  const removeNode = GeneratorInternal.useRemoveNode();

  // This state is intentionally not reactive, as we want to commit _what the layout was when this node was created_,
  // so that we don't accidentally remove a node with the same ID from a future/different layout.
  const layoutsWas = NodesStore.useStaticSelector((s) => s.layouts!);

  useEffect(() => {
    if (!isAdded) {
      const targetState = def.stateFactory(stateFactoryProps as never);
      console.log('NodeGenerator addNode targetState:', { nodeId: intermediateItem.id, depth: (targetState as any).depth, targetState });
      addNode({
        nodeId: intermediateItem.id,
        targetState,
      });
    }
  }, [addNode, def, intermediateItem.id, isAdded, layoutsWas, stateFactoryProps]);

  useEffect(
    () => () => {
      removeNode({ nodeId: intermediateItem.id, layouts: layoutsWas });
    },
    [intermediateItem.id, layoutsWas, removeNode],
  );

  return null;
}

/**
 * Creates props for the expression resolver that can be used to evaluate expressions in a component configuration.
 * These props are passed on to your component's `evalExpressions` method.
 */
export function useExpressionResolverProps<T extends CompTypes>(
  errorIntroText: string,
  rawItem: CompIntermediateExact<T> | undefined,
  allDataSources: ExpressionDataSources,
): ExprResolver<T> {
  // The hidden property is handled elsewhere, and should never be passed to the item (and resolved as an
  // expression) which could be read. Try useIsHidden() or useIsHiddenSelector() if you need to know if a
  // component is hidden.
  const item = useMemo(() => {
    const { hidden: _hidden, ...rest } = rawItem ?? {};
    return rest;
  }, [rawItem]) as CompIntermediate<T>;

  const evalProto = <T extends ExprVal>(
    type: T,
    expr: ExprValToActualOrExpr<T> | undefined,
    defaultValue: ExprValToActual<T>,
    dataSources?: Partial<ExpressionDataSources>,
  ) => {
    if (!ExprValidation.isValidOrScalar(expr, type, errorIntroText)) {
      return defaultValue;
    }

    return evalExpr(expr, { ...allDataSources, ...dataSources }, { returnType: type, defaultValue, errorIntroText });
  };

  const evalBool: SimpleEval<ExprVal.Boolean> = (expr, defaultValue, dataSources) =>
    evalProto(ExprVal.Boolean, expr, defaultValue, dataSources);

  const evalStr: SimpleEval<ExprVal.String> = (expr, defaultValue, dataSources) =>
    evalProto(ExprVal.String, expr, defaultValue, dataSources);

  const evalNum: SimpleEval<ExprVal.Number> = (expr, defaultValue, dataSources) =>
    evalProto(ExprVal.Number, expr, defaultValue, dataSources);
  const evalAny: SimpleEval<ExprVal.Any> = (expr, defaultValue, dataSources) =>
    evalProto(ExprVal.Any, expr, defaultValue, dataSources);

  // This resolves common expressions that are used by multiple components
  // and are not specific to a single component type.
  const evalBase = () => {
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
  };

  const evalFormProps = () => {
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
  };

  const evalSummarizable = () => {
    const out: ExprResolved<SummarizableComponentProps> = {};
    if (isSummarizableItem(item) && Array.isArray(item.forceShowInSummary)) {
      out.forceShowInSummary = evalBool(item.forceShowInSummary, false);
    }

    return out;
  };

  // This resolves all text resource bindings in a component
  const evalTrb = () => {
    const trb: Record<string, string> = {};
    if (item.textResourceBindings) {
      for (const [key, value] of Object.entries(item.textResourceBindings)) {
        trb[key] = evalStr(value, '');
      }
    }

    return {
      textResourceBindings: (item.textResourceBindings ? trb : undefined) as ExprResolved<ITextResourceBindings<T>>,
    };
  };

  return { item, evalBool, evalNum, evalStr, evalAny, evalBase, evalFormProps, evalSummarizable, evalTrb };
}

function useIntermediateItem<T extends CompTypes = CompTypes>(item: CompExternal<T>): CompIntermediate<T> {
  const recursiveMutators = GeneratorInternal.useRecursiveMutators();

  return useMemo(() => {
    const newItem = structuredClone(item) as CompIntermediate<T>;

    for (const mutator of recursiveMutators) {
      mutator(newItem);
    }

    return newItem;
  }, [item, recursiveMutators]);
}

function isFormItem(item: CompIntermediate): item is CompIntermediate & FormComponentProps {
  return 'readOnly' in item || 'required' in item || 'showValidations' in item;
}

function isSummarizableItem(item: CompIntermediate): item is CompIntermediate & SummarizableComponentProps {
  return 'renderAsSummary' in item;
}
