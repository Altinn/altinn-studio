import { useMemo } from 'react';

import { createSelector } from 'reselect';

import { evalExprInObj, ExprConfigForComponent, ExprConfigForGroup } from 'src/features/expressions';
import { allOptions } from 'src/features/options/useAllOptions';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { staticUseLanguageFromState, useLanguage } from 'src/hooks/useLanguage';
import { getLayoutComponentObject } from 'src/layout';
import { buildAuthContext } from 'src/utils/authContext';
import { buildInstanceContext } from 'src/utils/instanceContext';
import { generateEntireHierarchy } from 'src/utils/layout/HierarchyGenerator';
import type { CompInternal, HierarchyDataSources, ILayouts } from 'src/layout/layout';
import type { IRepeatingGroups, IRuntimeState } from 'src/types';
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
      delete input['rowsAfter'];
      delete input['rowsBefore'];

      const resolvedItem = evalExprInObj({
        input,
        node,
        dataSources,
        config,
        resolvingPerRow: false,
      }) as unknown as CompInternal;

      if (node.isType('Group') && node.isRepGroup()) {
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

export function dataSourcesFromState(state: IRuntimeState): HierarchyDataSources {
  return {
    formData: state.formData.formData,
    attachments: state.attachments.attachments,
    uiConfig: state.formLayout.uiConfig,
    options: allOptions,
    applicationSettings: state.applicationSettings.applicationSettings,
    instanceContext: buildInstanceContext(state.instanceData?.instance),
    hiddenFields: new Set(state.formLayout.uiConfig.hiddenFields),
    authContext: buildAuthContext(state.process),
    validations: state.formValidations.validations,
    devTools: state.devTools,
    langTools: staticUseLanguageFromState(state),
  };
}

export const selectDataSourcesFromState = createSelector(dataSourcesFromState, (data) => data);

function innerResolvedLayoutsFromState(
  layouts: ILayouts | null,
  currentView: string | undefined,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
): LayoutPages | undefined {
  if (!layouts || !currentView || !repeatingGroups) {
    return undefined;
  }

  return resolvedNodesInLayouts(layouts, currentView, repeatingGroups, dataSources);
}

export function resolvedLayoutsFromState(state: IRuntimeState) {
  return innerResolvedLayoutsFromState(
    state.formLayout.layouts,
    state.formLayout.uiConfig.currentView,
    state.formLayout.uiConfig.repeatingGroups,
    dataSourcesFromState(state),
  );
}

/**
 * This is a more efficient, memoized version of what happens above. This will only be used from ExprContext,
 * and trades verbosity and code duplication for performance and caching.
 */
function useResolvedExpressions() {
  const instance = useAppSelector((state) => state.instanceData?.instance);
  const formData = useAppSelector((state) => state.formData.formData);
  const attachments = useAppSelector((state) => state.attachments.attachments);
  const uiConfig = useAppSelector((state) => state.formLayout.uiConfig);
  const options = allOptions;
  const process = useAppSelector((state) => state.process);
  const applicationSettings = useAppSelector((state) => state.applicationSettings.applicationSettings);
  const hiddenFields = useAppSelector((state) => state.formLayout.uiConfig.hiddenFields);
  const validations = useAppSelector((state) => state.formValidations.validations);
  const layouts = useAppSelector((state) => state.formLayout.layouts);
  const currentView = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const devTools = useAppSelector((state) => state.devTools);
  const langTools = useLanguage();

  const dataSources: HierarchyDataSources = useMemo(
    () => ({
      formData,
      attachments,
      uiConfig,
      options,
      applicationSettings,
      instanceContext: buildInstanceContext(instance),
      authContext: buildAuthContext(process),
      hiddenFields: new Set(hiddenFields),
      validations,
      devTools,
      langTools,
    }),
    [
      formData,
      attachments,
      uiConfig,
      options,
      applicationSettings,
      instance,
      process,
      hiddenFields,
      validations,
      devTools,
      langTools,
    ],
  );

  return useMemo(
    () => innerResolvedLayoutsFromState(layouts, currentView, repeatingGroups, dataSources),
    [layouts, currentView, repeatingGroups, dataSources],
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
