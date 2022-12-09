import { useMemo } from 'react';

import { useAppSelector } from 'src/common/hooks';
import { nodesInLayouts, resolvedNodesInLayouts } from 'src/utils/layout/hierarchy';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { LayoutRootNodeCollection } from 'src/utils/layout/hierarchy';

/**
 * React hook used for getting a memoized LayoutRootNodeCollection where you can look up components.
 *
 * It can optionally also resolve expressions, if provided with expression data sources. If you only
 * want to resolve expressions for a single component, it is more efficient to use the hook specific
 * for that.
 *
 * @see useExpressions
 * @see useExpressionsForComponent
 */
export function useLayoutsAsNodes(dataSources?: undefined): LayoutRootNodeCollection;
export function useLayoutsAsNodes(dataSources?: ContextDataSources): LayoutRootNodeCollection<'resolved'>;
export function useLayoutsAsNodes(dataSources?: ContextDataSources | undefined): LayoutRootNodeCollection<any> {
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const layouts = useAppSelector((state) => state.formLayout.layouts);
  const current = useAppSelector((state) => state.formLayout.uiConfig.currentView);

  return useMemo(() => {
    return dataSources
      ? resolvedNodesInLayouts(layouts, current, repeatingGroups, dataSources)
      : nodesInLayouts(layouts, current, repeatingGroups);
  }, [layouts, current, repeatingGroups, dataSources]);
}
