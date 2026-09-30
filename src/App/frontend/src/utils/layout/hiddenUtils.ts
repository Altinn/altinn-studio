import { getComponentDef, implementsIsChildHidden } from 'src/layout';
import { isRepeatingChild } from 'src/utils/layout/plugins/claimRepeatingChildren';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';

interface HiddenExprSource {
  type: 'hidden' | 'hiddenRow' | 'hiddenPage';
  expr: ExprValToActualOrExpr<ExprVal.Boolean>;
  id: string;
}

interface HiddenCallbackSource {
  type: 'callback';
  callback: () => boolean;
  id: string;
}

export type HiddenSource = HiddenExprSource | HiddenCallbackSource;
export type HiddenReason = HiddenSource['type'] | 'pageOrder';

interface EvaluateHiddenSourcesProps {
  hiddenSources: HiddenSource[];
  pageOrder: string[];
  pageOrderSet?: Set<string>;
  pageKey: string | undefined;
  respectPageOrder?: boolean;
  evalHiddenExpression: (expr: HiddenExprSource['expr'], source: HiddenExprSource) => boolean;
}

export function collectHiddenSources(
  baseComponentId: string | undefined,
  layoutLookups: LayoutLookups,
): HiddenSource[] {
  const out: HiddenSource[] = [];
  if (baseComponentId === undefined) {
    return out;
  }

  const component = layoutLookups.allComponents[baseComponentId];
  if (component?.hidden !== undefined) {
    out.push({ type: 'hidden', expr: component.hidden, id: baseComponentId });
  }

  let childId = baseComponentId;
  let parent = layoutLookups.componentToParent[childId];
  while (parent?.type === 'node') {
    const parentComponent = layoutLookups.getComponent(parent.id);
    const parentDef = getComponentDef(parentComponent.type);
    if (implementsIsChildHidden(parentDef)) {
      const tmpParentId = parent.id;
      const tmpChildId = childId;
      const callback = () => parentDef.isChildHidden(tmpParentId, tmpChildId, layoutLookups);
      out.push({ type: 'callback', callback, id: parent.id });
    }
    if (
      parentComponent.type === 'RepeatingGroup' &&
      parentComponent.hiddenRow !== undefined &&
      isRepeatingChild(parentComponent.children, parentComponent.edit?.multiPage === true, childId)
    ) {
      out.push({ type: 'hiddenRow', expr: parentComponent.hiddenRow, id: parent.id });
    }
    if (parentComponent.hidden !== undefined) {
      out.push({ type: 'hidden', expr: parentComponent.hidden, id: parent.id });
    }
    childId = parent.id;
    parent = layoutLookups.componentToParent[childId];
  }

  const page = layoutLookups.componentToPage[baseComponentId];
  const hiddenExpr = page === undefined ? undefined : layoutLookups.hiddenPerPage[page];
  if (page !== undefined && hiddenExpr !== undefined) {
    out.push({ type: 'hiddenPage', expr: hiddenExpr, id: page });
  }

  return out.reverse();
}

export function evaluateHiddenSources({
  hiddenSources,
  pageOrder,
  pageOrderSet,
  pageKey,
  respectPageOrder = false,
  evalHiddenExpression,
}: EvaluateHiddenSourcesProps): { hidden: boolean; reason: HiddenReason | undefined } {
  const includedPages = pageOrderSet ?? new Set(pageOrder);
  if (respectPageOrder && pageKey !== undefined && !includedPages.has(pageKey)) {
    return { reason: 'pageOrder', hidden: true };
  }

  for (const source of hiddenSources) {
    if (source.type === 'callback') {
      if (source.callback()) {
        return { reason: source.type, hidden: true };
      }
      continue;
    }

    if (evalHiddenExpression(source.expr, source)) {
      return { reason: source.type, hidden: true };
    }
  }

  return { reason: undefined, hidden: false };
}
