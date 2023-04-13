import { useMemo } from 'react';

import { evalExprInObj, ExprConfigForComponent, ExprConfigForGroup } from 'src/features/expressions';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLayoutComponentObject } from 'src/layout';
import { buildInstanceContext } from 'src/utils/instanceContext';
import { generateEntireHierarchy } from 'src/utils/layout/HierarchyGenerator';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { ILayouts } from 'src/layout/layout';
import type { IRepeatingGroups, IRuntimeState, ITextResource } from 'src/types';
import type { AnyItem, HierarchyDataSources } from 'src/utils/layout/hierarchy.types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

/**
 * This will generate an entire layout hierarchy, iterate each
 * component/group in the layout and resolve all expressions for them.
 */
function resolvedNodesInLayouts(
  layouts: ILayouts | null,
  currentLayout: string,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
) {
  // A full copy is needed here because formLayout comes from the redux store, and in production code (not the
  // development server!) the properties are not mutable (but we have to mutate them below).
  const layoutsCopy: ILayouts = layouts ? structuredClone(layouts) : {};
  const unresolved = generateEntireHierarchy(
    layoutsCopy,
    currentLayout,
    repeatingGroups,
    dataSources,
    getLayoutComponentObject,
  );

  const config = {
    ...ExprConfigForComponent,
    ...ExprConfigForGroup,
  } as any;

  for (const layout of Object.values(unresolved.all())) {
    for (const node of layout.flat(true)) {
      const input = { ...node.item };
      delete input['children'];
      delete input['rows'];
      delete input['childComponents'];

      const resolvedItem = evalExprInObj({
        input,
        node,
        dataSources,
        config,
        resolvingPerRow: false,
      }) as unknown as AnyItem;

      if (node.isRepGroup()) {
        for (const row of node.item.rows) {
          if (!row) {
            continue;
          }
          const first = row.items[0];
          if (!first) {
            continue;
          }
          const firstItemNode = unresolved.findById(first.item.id);
          if (firstItemNode) {
            row.groupExpressions = evalExprInObj({
              input,
              node: firstItemNode,
              dataSources,
              config,
              resolvingPerRow: true,
              deleteNonExpressions: true,
            }) as any;
          }
        }
      }

      for (const key of Object.keys(resolvedItem)) {
        // Mutates node.item directly - this also mutates references to it and makes sure
        // we resolve expressions deep inside recursive structures.
        node.item[key] = resolvedItem[key];
      }
    }
  }

  return unresolved as unknown as LayoutPages;
}

/**
 * This updates the textResourceBindings for each node to match the new one made in replaceTextResourcesSaga.
 * It must be run _after_ resolving expressions, as that may decide to use other text resource bindings.
 *
 * @see replaceTextResourcesSaga
 * @see replaceTextResourceParams
 * @ßee getVariableTextKeysForRepeatingGroupComponent
 */
function rewriteTextResourceBindings(collection: LayoutPages, textResources: ITextResource[]) {
  for (const layout of Object.values(collection.all())) {
    for (const node of layout.flat(true)) {
      if (!node.item.textResourceBindings || node.rowIndex === undefined) {
        continue;
      }

      if (node.parent instanceof LayoutPage || !(node.parent.parent instanceof LayoutPage)) {
        // This only works in row items on the first level (not for nested repeating groups)
        continue;
      }

      const rewrittenItems = { ...node.item.textResourceBindings };
      if (textResources && node.item.textResourceBindings) {
        const bindingsWithVariablesForRepeatingGroups = Object.keys(rewrittenItems).filter((key) => {
          const textKey = rewrittenItems[key];
          const textResource = textResources.find((text) => text.id === textKey);
          return (
            textResource && textResource.variables && textResource.variables.find((v) => v.key.indexOf('[{0}]') > -1)
          );
        });

        bindingsWithVariablesForRepeatingGroups.forEach((key) => {
          rewrittenItems[key] = `${rewrittenItems[key]}-${node.rowIndex}`;
        });
      }

      node.item.textResourceBindings = { ...rewrittenItems };
    }
  }
}

export function dataSourcesFromState(state: IRuntimeState): HierarchyDataSources {
  return {
    formData: state.formData.formData,
    applicationSettings: state.applicationSettings.applicationSettings,
    instanceContext: buildInstanceContext(state.instanceData?.instance),
    hiddenFields: new Set(state.formLayout.uiConfig.hiddenFields),
    validations: state.formValidations.validations,
  };
}

function innerResolvedLayoutsFromState(
  layouts: ILayouts | null,
  currentView: string | undefined,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
  textResources: ITextResource[],
): LayoutPages | undefined {
  if (!layouts || !currentView || !repeatingGroups) {
    return undefined;
  }

  const resolved = resolvedNodesInLayouts(layouts, currentView, repeatingGroups, dataSources);
  rewriteTextResourceBindings(resolved, textResources);

  return resolved;
}

export function resolvedLayoutsFromState(state: IRuntimeState) {
  return innerResolvedLayoutsFromState(
    state.formLayout.layouts,
    state.formLayout.uiConfig.currentView,
    state.formLayout.uiConfig.repeatingGroups,
    dataSourcesFromState(state),
    state.textResources.resources,
  );
}

/**
 * This is a more efficient, memoized version of what happens above. This will only be used from ExprContext,
 * and trades verbosity and code duplication for performance and caching.
 */
function useResolvedExpressions() {
  const state = useAppSelector((state) => state);
  const instance = state.instanceData?.instance;
  const formData = state.formData.formData;
  const applicationSettings = state.applicationSettings.applicationSettings;
  const hiddenFields = state.formLayout.uiConfig.hiddenFields;
  const validations = state.formValidations.validations;
  const layouts = state.formLayout.layouts;
  const currentView = state.formLayout.uiConfig.currentView;
  const repeatingGroups = state.formLayout.uiConfig.repeatingGroups;
  const textResources = state.textResources.resources;

  const dataSources: HierarchyDataSources = useMemo(
    () => ({
      formData,
      applicationSettings,
      instanceContext: buildInstanceContext(instance),
      hiddenFields: new Set(hiddenFields),
      validations,
    }),
    [formData, applicationSettings, instance, hiddenFields, validations],
  );

  return useMemo(
    () => innerResolvedLayoutsFromState(layouts, currentView, repeatingGroups, dataSources, textResources),
    [layouts, currentView, repeatingGroups, dataSources, textResources],
  );
}

/**
 * Selector for use in redux sagas. Will return a fully resolved layouts tree.
 * Specify manually that the returned value from this is `LayoutPages`
 */
export const ResolvedNodesSelector = (state: IRuntimeState) => resolvedLayoutsFromState(state);

/**
 * Exported only for testing. Please do not use!
 */
export const _private = {
  resolvedNodesInLayouts,
  useResolvedExpressions,
};
