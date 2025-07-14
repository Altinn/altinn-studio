import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { applyLayoutQuirks } from 'src/features/form/layout/quirks';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { useHasInstance } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { CompExternal, ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

export interface LayoutContextValue {
  layouts: ILayouts;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
  expandedWidthLayouts: IExpandedWidthLayouts;
}

// Also used for prefetching @see formPrefetcher.ts
export function useLayoutQueryDef(
  enabled: boolean,
  defaultDataModelType: string,
  layoutSetId?: string,
): QueryDefinition<LayoutContextValue> {
  const { fetchLayouts } = useAppQueries();
  return {
    queryKey: ['formLayouts', layoutSetId, enabled],
    queryFn: layoutSetId
      ? () => fetchLayouts(layoutSetId).then((layouts) => processLayouts(layouts, layoutSetId, defaultDataModelType))
      : skipToken,
    enabled: enabled && !!layoutSetId,
  };
}

function useLayoutQuery() {
  const hasInstance = useHasInstance();
  const { data: process } = useProcessQuery();
  const currentLayoutSetId = useLayoutSetId();
  const defaultDataModel = useCurrentDataModelName() ?? 'unknown';

  // Waiting to fetch layouts until we have an instance, if we're supposed to have one
  // We don't want to fetch form layouts for a process step which we are currently not on
  const utils = useQuery(useLayoutQueryDef(hasInstance ? !!process : true, defaultDataModel, currentLayoutSetId));

  useEffect(() => {
    utils.error && window.logError('Fetching form layout failed:\n', utils.error);
  }, [utils.error]);

  return utils.data
    ? {
        ...utils,
        data: {
          ...utils.data,
          lookups: makeLayoutLookups(utils.data.layouts),
        },
      }
    : utils;
}
const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
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

  const overriddenLayoutSetId = useTaskStore((state) => state.overriddenLayoutSetId);

  if (overriddenLayoutSetId) {
    return overriddenLayoutSetId;
  }

  const layoutSetId =
    taskId != null
      ? layoutSets.find((set) => {
          if (set.tasks?.length) {
            return set.tasks.includes(taskId);
          }
          return false;
        })?.id
      : undefined;

  return layoutSetId ?? currentProcessLayoutSetId;
}

export function useDataTypeFromLayoutSet(layoutSetName: string | undefined) {
  const layoutSets = useLayoutSets();
  return layoutSets.find((set) => set.id === layoutSetName)?.dataType;
}

const emptyLayouts: ILayouts = {};
export const LayoutsProvider = Provider;
export const useLayouts = (): ILayouts => {
  const ctx = useLaxCtx();
  return ctx === ContextNotProvided ? emptyLayouts : (ctx.layouts ?? emptyLayouts);
};
export const useLayoutLookups = () => useCtx().lookups;
export const useLayoutLookupsLax = () => {
  const ctx = useLaxCtx();
  return ctx === ContextNotProvided ? undefined : ctx.lookups;
};

const noExpressions: IHiddenLayoutsExternal = {};
export const useHiddenLayoutsExpressions = () => {
  const ctx = useLaxCtx();
  return ctx === ContextNotProvided ? noExpressions : ctx.hiddenLayoutsExpressions;
};

export const useExpandedWidthLayouts = () => useCtx().expandedWidthLayouts;

function processLayouts(input: ILayoutCollection, layoutSetId: string, dataModelType: string): LayoutContextValue {
  const layouts: ILayouts = {};
  const hiddenLayoutsExpressions: IHiddenLayoutsExternal = {};
  const expandedWidthLayouts: IExpandedWidthLayouts = {};
  for (const key of Object.keys(input)) {
    const file = input[key];
    layouts[key] = cleanLayout(file.data.layout, dataModelType);
    hiddenLayoutsExpressions[key] = file.data.hidden;
    expandedWidthLayouts[key] = file.data.expandedWidth;
  }

  const withQuirksFixed = applyLayoutQuirks(layouts, layoutSetId);
  removeDuplicateComponentIds(withQuirksFixed, layoutSetId);
  addLikertItemToLayout(withQuirksFixed);

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

function addLikertItemToLayout(layouts: ILayouts) {
  for (const pageKey of Object.keys(layouts)) {
    const page = layouts[pageKey] || [];
    for (const comp of page.values()) {
      if (comp.type === 'Likert') {
        const likertItem: CompExternal<'LikertItem'> = {
          id: makeLikertChildId(comp.id),
          type: 'LikertItem',
          textResourceBindings: {
            title: comp.textResourceBindings?.questions,
          },
          dataModelBindings: {
            simpleBinding: comp.dataModelBindings?.answer,
          },
          options: comp.options,
          optionsId: comp.optionsId,
          mapping: comp.mapping,
          required: comp.required,
          secure: comp.secure,
          queryParameters: comp.queryParameters,
          readOnly: comp.readOnly,
          sortOrder: comp.sortOrder,
          showValidations: comp.showValidations,
          grid: comp.grid,
          source: comp.source,
          hidden: comp.hidden,
          pageBreak: comp.pageBreak,
          renderAsSummary: comp.renderAsSummary,
          columns: comp.columns,
        };
        page.push(likertItem);
      }
    }
  }
}
