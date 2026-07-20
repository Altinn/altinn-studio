import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { deriveRuntimeNodeRefs, type RuntimeNodeRef } from 'src/utils/layout/deriveRuntimeNodeRefs';
import { getCurrentDataModelPath } from 'src/utils/layout/rowContext';
import { collectHiddenSources, evaluateHiddenSources } from 'src/utils/layout/runtimeHiddenUtils';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { HiddenSource } from 'src/utils/layout/runtimeHiddenUtils';

const runtimeNodesByState = new WeakMap<FormStoreState, Map<string, RuntimeNodeRef[]>>();

function getRuntimeNodes(state: FormStoreState, pageKeys: Iterable<string> | undefined): RuntimeNodeRef[] {
  let cachedByPages = runtimeNodesByState.get(state);
  if (!cachedByPages) {
    cachedByPages = new Map();
    runtimeNodesByState.set(state, cachedByPages);
  }

  const includedPages = pageKeys ? [...pageKeys] : undefined;
  const cacheKey = includedPages ? JSON.stringify([...includedPages].sort()) : '*';
  const cached = cachedByPages.get(cacheKey);
  if (cached) {
    return cached;
  }

  const nodes = deriveRuntimeNodeRefs(state, includedPages);
  cachedByPages.set(cacheKey, nodes);
  return nodes;
}

export interface DerivedValidationNode extends RuntimeNodeRef {
  hidden: boolean;
  isValid: boolean;
}

export interface DeriveNodesInputs {
  pageOrder: string[];
  includedPageKeys?: Iterable<string>;
  includedNodeIds?: Iterable<string>;
  pdfLayoutName: string | undefined;
  hiddenDataSources: ExpressionDataSources;
}

/**
 * Creates expression data sources scoped to the current repeating-group row.
 * Expressions use this runtime path to resolve relative data model references.
 */
export function withCurrentDataModelPath(
  dataSources: ExpressionDataSources,
  currentDataModelPath: ReturnType<typeof getCurrentDataModelPath>,
): ExpressionDataSources {
  return {
    ...dataSources,
    currentDataModelPath,
    context: {
      ...dataSources.context,
      currentDataModelPath: () => currentDataModelPath,
    },
  };
}

/**
 * Adds validation-only hidden-expression and page-validity state to the
 * neutral ephemeral layout hierarchy.
 */
export function deriveNodes(state: FormStoreState, inputs: DeriveNodesInputs): DerivedValidationNode[] {
  const hiddenSourcesByBaseId = new Map<string, HiddenSource[]>();

  function getHiddenSources(baseId: string): HiddenSource[] {
    const cached = hiddenSourcesByBaseId.get(baseId);
    if (cached) {
      return cached;
    }

    const hiddenSources = collectHiddenSources(baseId, state.bootstrap.layoutLookups);
    hiddenSourcesByBaseId.set(baseId, hiddenSources);
    return hiddenSources;
  }

  const pageOrderSet = new Set(inputs.pageOrder);

  function evaluateHidden(node: RuntimeNodeRef) {
    const hiddenRuntime = withCurrentDataModelPath(inputs.hiddenDataSources, getCurrentDataModelPath(node.rowContexts));
    return evaluateHiddenSources({
      hiddenSources: getHiddenSources(node.baseId),
      pageOrder: inputs.pageOrder,
      pageOrderSet,
      pageKey: node.pageKey,
      respectPageOrder: true,
      evalHiddenExpression: (expr, source) =>
        evalExpr(expr, hiddenRuntime, {
          returnType: ExprVal.Boolean,
          defaultValue: false,
          errorIntroText:
            source.type === 'hiddenPage'
              ? `Hidden expression for page ${source.id} failed`
              : `Expression in property ${source.type} for component ${source.id} failed`,
        }),
    }).hidden;
  }

  const includedNodeIds = inputs.includedNodeIds ? new Set(inputs.includedNodeIds) : undefined;
  const layoutNodes = getRuntimeNodes(state, inputs.includedPageKeys).filter(
    (node) => !includedNodeIds || includedNodeIds.has(node.id),
  );

  return layoutNodes.map((node) => ({
    ...node,
    hidden: evaluateHidden(node),
    isValid: pageOrderSet.has(node.pageKey) || node.pageKey === inputs.pdfLayoutName,
  }));
}
