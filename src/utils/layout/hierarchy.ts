import { useMemo, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useAttachments } from 'src/features/attachments/AttachmentsContext';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { evalExprInObj, ExprConfigForComponent, ExprConfigForGroup } from 'src/features/expressions';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { usePageNavigationConfig } from 'src/features/form/layout/PageNavigationContext';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguageWithForcedNodeSelector } from 'src/features/language/useLanguage';
import { useAllOptionsSelector } from 'src/features/options/useAllOptions';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { getLayoutComponentObject } from 'src/layout';
import { buildAuthContext } from 'src/utils/authContext';
import { generateEntireHierarchy } from 'src/utils/layout/HierarchyGenerator';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import type { CompInternal, HierarchyDataSources, ILayouts } from 'src/layout/layout';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { useIsHiddenComponent } from 'src/utils/layout/NodesContext';
/**
 * This will generate an entire layout hierarchy, iterate each
 * component/group in the layout and resolve all expressions for them.
 */
function resolvedNodesInLayouts(
  layouts: ILayouts | null,
  currentView: string | undefined,
  dataSources: HierarchyDataSources,
  previousNodes?: LayoutPages,
) {
  // A full copy is needed here because formLayout comes from the redux store, and in production code (not the
  // development server!) the properties are not mutable (but we have to mutate them below).
  const layoutsCopy: ILayouts = layouts ? structuredClone(layouts) : {};
  const unresolved = generateEntireHierarchy(layoutsCopy, currentView, dataSources, getLayoutComponentObject);

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
      delete input['cardsInternal'];

      const resolvedItem = evalExprInObj({
        input,
        node,
        dataSources,
        config,
        resolvingPerRow: false,
      }) as unknown as CompInternal;

      if (node.item.type === 'RepeatingGroup') {
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

  // We know that the hierarchy is re-generated much too often, and while a proper solution is difficult to implement,
  // a stop-gap solution is to compare the previous hierarchy with the new one, and replace unchanged nodes with the
  // old ones. Since React uses shallow comparison, this will prevent unnecessary re-renders.
  if (previousNodes) {
    for (const pageKey of previousNodes.allPageKeys()) {
      const oldPage = previousNodes.findLayout(pageKey);
      const newPage = unresolved.findLayout(pageKey);
      if (!newPage || !oldPage) {
        continue;
      }

      for (const oldNode of oldPage.children()) {
        if (containsLayoutNode(oldNode.item)) {
          // We don't want to replace nodes that contain other nodes, because at that point we would have to
          // compare and replace at that level as well. This, along with .children() above, ensures that we only
          // replace the top-level nodes.
          continue;
        }
        const newNode = newPage.findById(oldNode.item.id);
        if (newNode && deepEqual(oldNode.item, newNode.item)) {
          // Some values in oldNode needs to be replaced so that references and functions still work
          oldNode.parent = newNode.parent;
          oldNode.top = newNode.top;
          oldNode.dataSources = newNode.dataSources;
          oldNode.hiddenCache = {};

          newPage.replaceNode(newNode, oldNode);
        }
      }
    }
  }

  return unresolved as unknown as LayoutPages;
}

/**
 * Recursive function to check if a node.item contains other LayoutNode objects somewhere inside
 */
function containsLayoutNode(obj: unknown): boolean {
  if (obj instanceof BaseLayoutNode) {
    return true;
  }

  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  for (const key of Object.keys(obj)) {
    if (containsLayoutNode(obj[key])) {
      return true;
    }
  }

  return false;
}

const emptyObject = {};
export function useExpressionDataSources(isHidden: ReturnType<typeof useIsHiddenComponent>): HierarchyDataSources {
  const instanceDataSources = useLaxInstanceDataSources();
  const formDataSelector = FD.useDebouncedSelector();
  const layoutSettings = useLayoutSettings();
  const attachments = useAttachments();
  const options = useAllOptionsSelector(true);
  const process = useLaxProcessData();
  const applicationSettings = useApplicationSettings();
  const devToolsIsOpen = useDevToolsStore((state) => state.isOpen);
  const devToolsHiddenComponents = useDevToolsStore((state) => state.hiddenComponents);
  const langToolsSelector = useLanguageWithForcedNodeSelector();
  const currentLanguage = useCurrentLanguage();
  const pageNavigationConfig = usePageNavigationConfig();
  const authContext = useMemo(() => buildAuthContext(process?.currentTask), [process?.currentTask]);

  return useMemo(
    () => ({
      formDataSelector,
      attachments: attachments || emptyObject,
      layoutSettings,
      pageNavigationConfig,
      process,
      options: options || emptyObject,
      applicationSettings,
      instanceDataSources,
      authContext,
      isHidden,
      devToolsIsOpen,
      devToolsHiddenComponents,
      langToolsSelector,
      currentLanguage,
    }),
    [
      formDataSelector,
      attachments,
      layoutSettings,
      pageNavigationConfig,
      options,
      process,
      applicationSettings,
      instanceDataSources,
      authContext,
      isHidden,
      devToolsIsOpen,
      devToolsHiddenComponents,
      langToolsSelector,
      currentLanguage,
    ],
  );
}

function useResolvedExpressions(isHidden: ReturnType<typeof useIsHiddenComponent>) {
  const layouts = useLayouts();
  const currentView = useCurrentView();
  const dataSources = useExpressionDataSources(isHidden);
  const previousNodesRef = useRef<LayoutPages>();
  const nodes = useMemo(
    () => resolvedNodesInLayouts(layouts, currentView, dataSources, previousNodesRef.current),
    [layouts, currentView, dataSources],
  );
  previousNodesRef.current = nodes;

  return nodes;
}

/**
 * Exported only for testing. Please do not use!
 */
export const _private = {
  resolvedNodesInLayouts,
  useResolvedExpressions,
};
