import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { applyLayoutQuirks } from 'src/features/form/layout/quirks';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';
import { useHasInstance } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

export interface LayoutContextValue {
  layouts: ILayouts;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
  expandedWidthLayouts: IExpandedWidthLayouts;
}

// Also used for prefetching @see formPrefetcher.ts
export function useLayoutQueryDef(enabled: boolean, layoutSetId?: string): QueryDefinition<LayoutContextValue> {
  const { fetchLayouts } = useAppQueries();
  return {
    queryKey: ['formLayouts', layoutSetId, enabled],
    queryFn: layoutSetId
      ? () => fetchLayouts(layoutSetId).then((layouts) => processLayouts(layouts, layoutSetId))
      : skipToken,
    enabled: enabled && !!layoutSetId,
  };
}

function useLayoutQuery() {
  const hasInstance = useHasInstance();
  const process = useLaxProcessData();
  const currentLayoutSetId = useLayoutSetId();

  // Waiting to fetch layouts until we have an instance, if we're supposed to have one
  // We don't want to fetch form layouts for a process step which we are currently not on
  const utils = useQuery(useLayoutQueryDef(hasInstance ? !!process : true, currentLayoutSetId));

  useEffect(() => {
    utils.error && window.logError('Fetching form layout failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}
const { Provider, useCtx } = delayedContext(() =>
  createQueryContext({
    name: 'LayoutsContext',
    required: true,
    query: useLayoutQuery,
  }),
);

export function useLayoutSetId() {
  const layoutSets = useLayoutSets();
  const currentProcessLayoutSetId = useCurrentLayoutSetId();
  const taskId = useNavigationParam('taskId');

  const { overriddenLayoutSetId } = useTaskStore(({ overriddenLayoutSetId }) => ({ overriddenLayoutSetId }));

  if (overriddenLayoutSetId) {
    return overriddenLayoutSetId;
  }

  const layoutSetId = taskId != null ? layoutSets?.sets.find((set) => set.tasks?.includes(taskId))?.id : undefined;

  return layoutSetId ?? currentProcessLayoutSetId;
}
export const LayoutsProvider = Provider;
export const useLayouts = () => useCtx().layouts;

export const useHiddenLayoutsExpressions = () => useCtx().hiddenLayoutsExpressions;

export const useExpandedWidthLayouts = () => useCtx().expandedWidthLayouts;

function processLayouts(input: ILayoutCollection, layoutSetId: string): LayoutContextValue {
  const layouts: ILayouts = {};
  const hiddenLayoutsExpressions: IHiddenLayoutsExternal = {};
  const expandedWidthLayouts: IExpandedWidthLayouts = {};
  for (const key of Object.keys(input)) {
    const file = input[key];
    layouts[key] = cleanLayout(file.data.layout);
    hiddenLayoutsExpressions[key] = file.data.hidden;
    expandedWidthLayouts[key] = file.data.expandedWidth;
  }

  const withQuirksFixed = applyLayoutQuirks(layouts, layoutSetId);
  removeDuplicateComponentIds(withQuirksFixed, layoutSetId);

  return {
    layouts: withQuirksFixed,
    hiddenLayoutsExpressions,
    expandedWidthLayouts,
  };
}

function removeDuplicateComponentIds(layouts: ILayouts, layoutSetId: string) {
  const seenIds = new Map<string, { pageKey: string; idx: number }>();
  const quirksCode = {
    verifyAndApplyEarly: new Set<string>(),
    verifyAndApplyLate: new Set<string>(),
    logMessages: new Set<string>(),
  };

  for (const pageKey of Object.keys(layouts)) {
    const page = layouts[pageKey] || [];
    const toRemove: number[] = [];
    for (const [idx, comp] of page.entries()) {
      const prev = seenIds.get(comp.id);
      if (prev) {
        window.logError(
          `Removed duplicate component id '${comp.id}' from page '${pageKey}' at index ${idx} ` +
            `(first found on page '${prev.pageKey})' at index ${prev.idx})`,
        );
        toRemove.push(idx);

        quirksCode.verifyAndApplyEarly.add(`assert(layouts['${prev.pageKey}']![${prev.idx}].id === '${comp.id}');`);
        quirksCode.verifyAndApplyEarly.add(`assert(layouts['${pageKey}']![${idx}].id === '${comp.id}');`);
        quirksCode.verifyAndApplyLate.add(`layouts['${pageKey}']![${idx}].id = '${comp.id}Duplicate';`);
        quirksCode.logMessages.add(
          `\`Renamed component id '${comp.id}' to '${comp.id}Duplicate' on page '${pageKey}'\``,
        );

        continue;
      }
      seenIds.set(comp.id, { pageKey, idx });
    }
    toRemove.reverse(); // Remove from the end to avoid changing the indexes
    for (const idx of toRemove) {
      page.splice(idx, 1);
    }
  }

  if (quirksCode.verifyAndApplyEarly.size) {
    const code: string[] = [];
    code.push('{');
    code.push('  verifyAndApply: (layouts) => {');
    code.push(`    ${[...quirksCode.verifyAndApplyEarly.values()].join('\n    ')}`);
    code.push('');
    code.push(`    ${[...quirksCode.verifyAndApplyLate.values()].join('\n    ')}`);
    code.push('  },');
    code.push('  logMessages: [');
    code.push(`    ${[...quirksCode.logMessages.values()].join(',\n    ')}`);
    code.push('  ],');
    code.push('}');
    const fullKey = `${window.org}/${window.app}/${layoutSetId}`;
    const _fullCode = `'${fullKey}': ${code.join('\n')},`;
    // Uncomment the next line to get the generated quirks code
    // debugger;
  }
}
