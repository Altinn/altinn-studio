import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { getDerivedNodeDescendantIds } from 'src/utils/layout/derivedNodeTraversal';
import { deriveRuntimeNodeRefs, type RuntimeNodeRef } from 'src/utils/layout/deriveRuntimeNodeRefs';
import { collectHiddenSources, evaluateHiddenSources } from 'src/utils/layout/hiddenUtils';
import { getCurrentDataModelPath } from 'src/utils/layout/rowContext';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { HiddenSource } from 'src/utils/layout/hiddenUtils';

type IndexedRuntimeNodes = { nodes: RuntimeNodeRef[]; indexById: Map<string, number> };

const runtimeNodesByState = new WeakMap<FormStoreState, Map<string, IndexedRuntimeNodes>>();

function getRuntimeNodes(state: FormStoreState, pageKeys: Iterable<string> | undefined): IndexedRuntimeNodes {
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
  const indexed = { nodes, indexById: new Map(nodes.map((node, index) => [node.id, index])) };
  cachedByPages.set(cacheKey, indexed);
  return indexed;
}

export interface DerivedValidationNode extends RuntimeNodeRef {
  hidden: boolean;
  isValid: boolean;
}

export interface DeriveNodesInputs {
  pageOrder: string[];
  includedPageKeys?: Iterable<string>;
  includedNodeIds?: Iterable<string>;
  descendantScope?: { nodeId: string; includeSelf: boolean; restriction?: number };
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
  const hiddenResults = new Map<string, boolean>();

  function evaluateHidden(node: RuntimeNodeRef) {
    const currentDataModelPath = getCurrentDataModelPath(node.rowContexts);
    const hiddenRuntime = withCurrentDataModelPath(inputs.hiddenDataSources, currentDataModelPath);
    return evaluateHiddenSources({
      hiddenSources: getHiddenSources(node.baseId),
      pageOrder: inputs.pageOrder,
      pageOrderSet,
      pageKey: node.pageKey,
      respectPageOrder: true,
      evalHiddenExpression: (expr, source) => {
        const cacheKey = JSON.stringify([
          source.type,
          source.id,
          currentDataModelPath?.dataType,
          currentDataModelPath?.field,
        ]);
        const cached = hiddenResults.get(cacheKey);
        if (cached !== undefined) {
          return cached;
        }

        const hidden = evalExpr(expr, hiddenRuntime, {
          returnType: ExprVal.Boolean,
          defaultValue: false,
          errorIntroText:
            source.type === 'hiddenPage'
              ? `Hidden expression for page ${source.id} failed`
              : `Expression in property ${source.type} for component ${source.id} failed`,
        });
        hiddenResults.set(cacheKey, hidden);
        return hidden;
      },
    }).hidden;
  }

  const includedNodeIds = inputs.includedNodeIds ? new Set(inputs.includedNodeIds) : undefined;
  const { nodes: runtimeNodes, indexById } = getRuntimeNodes(state, inputs.includedPageKeys);
  const scope = inputs.descendantScope;
  const descendantIds = scope
    ? new Set([
        ...(scope.includeSelf ? [scope.nodeId] : []),
        ...getDerivedNodeDescendantIds(runtimeNodes, scope.nodeId, scope.restriction),
      ])
    : undefined;
  // Field and row selectors request a small scope. Look up that scope instead of
  // scanning every row for each selector, while preserving the original layout order.
  const requestedIds = includedNodeIds
    ? [...includedNodeIds].filter((id) => !descendantIds || descendantIds.has(id))
    : descendantIds;
  const layoutNodes = requestedIds
    ? [...requestedIds]
        .map((id) => indexById.get(id))
        .filter((index): index is number => index !== undefined)
        .sort((a, b) => a - b)
        .map((index) => runtimeNodes[index])
    : runtimeNodes;

  return layoutNodes.map((node) => ({
    ...node,
    hidden: evaluateHidden(node),
    isValid: pageOrderSet.has(node.pageKey) || node.pageKey === inputs.pdfLayoutName,
  }));
}
