import deepEqual from 'fast-deep-equal';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ExprConfig } from 'src/features/expressions/types';
import type { IHiddenLayoutsExternal } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export function runExpressionRules(layouts: LayoutPages, future: Set<string>) {
  const shouldIncludeGroups = true;
  for (const layout of Object.values(layouts.all())) {
    for (const node of layout.flat(shouldIncludeGroups)) {
      if (node.isHidden({ respectLegacy: false })) {
        future.add(node.item.id);
      }
    }
  }
}

export function runExpressionsForLayouts(
  nodes: LayoutPages,
  hiddenLayoutsExpr: IHiddenLayoutsExternal,
  dataSources: ContextDataSources,
): Set<string> {
  const config: ExprConfig<ExprVal.Boolean> = {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    resolvePerRow: false,
  };

  const hiddenLayouts: Set<string> = new Set();
  for (const key of Object.keys(hiddenLayoutsExpr)) {
    const layout = nodes.findLayout(key);
    if (!layout) {
      continue;
    }

    let isHidden = hiddenLayoutsExpr[key];
    if (typeof isHidden === 'object' && isHidden !== null) {
      isHidden = evalExpr(isHidden, layout, dataSources, { config }) as boolean;
    }
    if (isHidden === true) {
      hiddenLayouts.add(key);
    }
  }

  return hiddenLayouts;
}

export function shouldUpdate(currentList: Set<string>, newList: Set<string>): boolean {
  if (currentList.size !== newList.size) {
    return true;
  }

  const present = [...currentList.values()].sort();
  const future = [...newList.values()].sort();

  return !deepEqual(present, future);
}
