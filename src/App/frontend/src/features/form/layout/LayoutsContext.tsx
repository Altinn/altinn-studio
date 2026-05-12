import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import type { CompExternal, ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal, IPreventNavigationLayouts } from 'src/types';

export function processLayouts(layouts: ILayoutCollection, dataModelType: string) {
  const processedLayouts: ILayouts = {};
  const hiddenLayoutsExpressions: IHiddenLayoutsExternal = {};
  const expandedWidthLayouts: IExpandedWidthLayouts = {};
  const preventNavigationLayouts: IPreventNavigationLayouts = {};

  for (const key of Object.keys(layouts)) {
    const file = layouts[key];
    processedLayouts[key] = cleanLayout(file.data.layout, dataModelType);
    hiddenLayoutsExpressions[key] = file.data.hidden;
    expandedWidthLayouts[key] = file.data.expandedWidth;
    preventNavigationLayouts[key] = !!file.data.validationOnNavigation;
  }

  removeDuplicateComponentIds(processedLayouts);
  addLikertItemToLayout(processedLayouts);

  return {
    layouts,
    processedLayouts,
    hiddenLayoutsExpressions,
    expandedWidthLayouts,
    preventNavigationLayouts,
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
