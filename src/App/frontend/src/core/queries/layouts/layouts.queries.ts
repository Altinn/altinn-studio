import { queryOptions, skipToken } from '@tanstack/react-query';

import { LayoutApi } from 'src/core/api-client/layout.api';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import type { CompExternal, ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

export interface LayoutQueryData {
  layouts: ILayouts;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
  expandedWidthLayouts: IExpandedWidthLayouts;
}

export interface LayoutFetchFns {
  fetchLayouts: (uiFolder: string) => Promise<ILayoutCollection>;
  fetchLayoutsForInstance: (uiFolder: string, instanceId: string) => Promise<ILayoutCollection>;
}

const defaultFetchFns: LayoutFetchFns = {
  fetchLayouts: LayoutApi.getLayouts,
  fetchLayoutsForInstance: LayoutApi.getLayoutsForInstance,
};

export const layoutQueryKeys = {
  all: () => ['formLayouts'] as const,
  layouts: (uiFolder: string | undefined, enabled: boolean) => [...layoutQueryKeys.all(), uiFolder, enabled] as const,
};

export function layoutQueryDef(
  enabled: boolean,
  defaultDataModelType: string,
  uiFolder: string | undefined,
  instanceId: string | undefined,
  fetchFns: LayoutFetchFns = defaultFetchFns,
) {
  const features = getApplicationMetadata().features ?? {};

  return queryOptions({
    queryKey: layoutQueryKeys.layouts(uiFolder, enabled),
    queryFn:
      uiFolder && enabled
        ? async () => {
            const shouldUseInstanceEndpoint = features.addInstanceIdentifierToLayoutRequests && instanceId;
            const layouts = shouldUseInstanceEndpoint
              ? await fetchFns.fetchLayoutsForInstance(uiFolder, instanceId)
              : await fetchFns.fetchLayouts(uiFolder);

            return processLayouts(layouts, defaultDataModelType);
          }
        : skipToken,
  });
}

function processLayouts(input: ILayoutCollection, dataModelType: string): LayoutQueryData {
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
    toRemove.reverse();
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
