// Also used for prefetching @see formPrefetcher.ts
import { useEffect, useMemo } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import { useInstanceDataQuery } from 'nextsrc/nexttanstack/domain/Instance/useInstanceQuery';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { applyLayoutQuirks } from 'src/features/form/layout/quirks';
import { useLayoutSetIdFromUrl } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { CompExternal, ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

export interface LayoutValue {
  layouts: ILayouts;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
  expandedWidthLayouts: IExpandedWidthLayouts;
}

export const getLayoutQueryKey = (layoutSetId?: string) => ['formLayouts', layoutSetId];

export function useLayoutQueryDef(
  enabled: boolean,
  defaultDataModelType: string,
  layoutSetId?: string,
): QueryDefinition<LayoutValue> {
  const { fetchLayouts } = useAppQueries();
  return {
    queryKey: getLayoutQueryKey(layoutSetId),
    queryFn: layoutSetId
      ? () => fetchLayouts(layoutSetId).then((layouts) => processLayouts(layouts, layoutSetId, defaultDataModelType))
      : skipToken,
    enabled: enabled && !!layoutSetId,
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

export function processLayouts(input: ILayoutCollection, layoutSetId: string, dataModelType: string): LayoutValue {
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

export function useLayoutQuery() {
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
