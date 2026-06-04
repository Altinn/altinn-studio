import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { type DerivedLayoutNode, deriveLayoutNodes, getCurrentDataModelPath } from 'src/utils/layout/deriveLayoutNodes';
import { collectHiddenSources, evaluateHiddenSources } from 'src/utils/layout/hiddenUtils';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { HiddenSource } from 'src/utils/layout/hiddenUtils';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

export type DerivedValidationNode = DerivedLayoutNode & {
  hidden: boolean;
  isValid: boolean;
};

type DeriveNodesInputs = {
  pageOrder: string[];
  includedPageKeys?: Iterable<string>;
  pdfLayoutName: string | undefined;
  hiddenDataSources: ExpressionDataSources;
};

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

export { getCurrentDataModelPath };

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

    const hiddenSources = collectHiddenSources(baseId, state.bootstrap.layoutLookups).reverse();
    hiddenSourcesByBaseId.set(baseId, hiddenSources);
    return hiddenSources;
  }

  function evaluateHidden(node: DerivedLayoutNode) {
    const hiddenRuntime = withCurrentDataModelPath(inputs.hiddenDataSources, getCurrentDataModelPath(node.rowContexts));
    return evaluateHiddenSources({
      hiddenSources: getHiddenSources(node.baseId),
      pageOrder: inputs.pageOrder,
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

  return deriveLayoutNodes(state, inputs.includedPageKeys).map((node) => ({
    ...node,
    hidden: evaluateHidden(node),
    isValid: inputs.pageOrder.includes(node.pageKey) || node.pageKey === inputs.pdfLayoutName,
  }));
}
