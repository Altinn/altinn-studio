import { useEffect, useMemo } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { getLayoutSets } from 'src/features/form/layoutSets';
import { useLayoutSetIdFromUrl } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { useInstanceDataQuery, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { fetchLayoutsForInstance } from 'src/queries/queries';
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
  const instanceId = useLaxInstanceId();
  const features = getApplicationMetadata().features ?? {};

  return {
    queryKey: ['formLayouts', layoutSetId, enabled],
    queryFn: layoutSetId
      ? async () => {
          const shouldUseInstanceEndpoint = features.addInstanceIdentifierToLayoutRequests && instanceId;
          const layouts = shouldUseInstanceEndpoint
            ? await fetchLayoutsForInstance(layoutSetId, instanceId)
            : await fetchLayouts(layoutSetId);

          return processLayouts(layouts, defaultDataModelType);
        }
      : skipToken,
    enabled: enabled && !!layoutSetId,
  };
}

function useLayoutQuery() {
  const { data: process } = useProcessQuery();
  const currentLayoutSetId = useLayoutSetIdFromUrl();
  const defaultDataModel = useCurrentDataModelName() ?? 'unknown';
  const hasInstance = !!useInstanceDataQuery().data;

  // Waiting to fetch layouts until we have an instance, if we're supposed to have one
  // We don't want to fetch form layouts for a process step which we are currently not on
  const utils = useQuery(useLayoutQueryDef(hasInstance ? !!process : true, defaultDataModel, currentLayoutSetId));

  useEffect(() => {
    utils.error && window.logError('Fetching form layout failed:\n', utils.error);
  }, [utils.error]);

  const data = useMemo(() => {
    if (utils.data) {
      return {
        ...utils.data,
        lookups: makeLayoutLookups(utils.data.layouts),
      };
    }

    return utils.data;
  }, [utils.data]);

  return { ...utils, data };
}
const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext({
    name: 'LayoutsContext',
    required: true,
    query: useLayoutQuery,
  }),
);

export function useDataTypeFromLayoutSet(layoutSetName: string | undefined) {
  const layoutSets = getLayoutSets();
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

function processLayouts(input: ILayoutCollection, dataModelType: string): LayoutContextValue {
  const layouts: ILayouts = {};
  const hiddenLayoutsExpressions: IHiddenLayoutsExternal = {};
  const expandedWidthLayouts: IExpandedWidthLayouts = {};
  for (const key of Object.keys(input)) {
    const file = input[key];
    layouts[key] = cleanLayout(file.data.layout, dataModelType);
    hiddenLayoutsExpressions[key] = file.data.hidden;
    expandedWidthLayouts[key] = file.data.expandedWidth;
  }

  removeDuplicateComponentIds(layouts);
  addLikertItemToLayout(layouts);

  return {
    layouts,
    hiddenLayoutsExpressions,
    expandedWidthLayouts,
  };
}

function removeDuplicateComponentIds(layouts: ILayouts) {
  const seenIds = new Map<string, { pageKey: string; idx: number }>();

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

        continue;
      }
      seenIds.set(comp.id, { pageKey, idx });
    }
    toRemove.reverse(); // Remove from the end to avoid changing the indexes
    for (const idx of toRemove) {
      page.splice(idx, 1);
    }
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
