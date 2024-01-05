import React, { useEffect, useMemo } from 'react';

import { createContext } from 'src/core/contexts/context';
import {
  runExpressionRules,
  runExpressionsForLayouts,
  shouldUpdate,
} from 'src/features/form/dynamics/conditionalRenderingSagas';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useHiddenLayoutsExpressions } from 'src/features/form/layout/LayoutsContext';
import { usePageNavigationContext } from 'src/features/form/layout/PageNavigationContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { runConditionalRenderingRules } from 'src/utils/conditionalRendering';
import { _private, selectDataSourcesFromState } from 'src/utils/layout/hierarchy';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import type { HierarchyDataSources, LayoutNodeFromObj } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export const { Provider, useCtx } = createContext<LayoutPages | undefined>({
  name: 'Nodes',
  required: false,
  default: undefined,
});

/**
 * React hook used for getting a memoized LayoutPages object where you can look up components.
 * Do not use this directly, rather useExprContext(), which will fetch you a hierarchy of components
 * with their expressions resolved.
 *
 * @see useResolvedNode
 */
function useLayoutsAsNodes(): LayoutPages | undefined {
  return _private.useResolvedExpressions();
}

export const NodesProvider = (props: React.PropsWithChildren) => {
  const resolvedNodes = useLayoutsAsNodes();
  useLegacyHiddenComponents(resolvedNodes);

  return <Provider value={resolvedNodes}>{props.children}</Provider>;
};

/**
 * Use the expression context. This will return a LayoutPages object containing the full tree of resolved
 * nodes (meaning, instances of layout components in a tree, with their expressions evaluated and resolved to
 * scalar values).
 *
 * Usually, if you're looking for a specific component/node, useResolvedNode() is better.
 */
export const useNodes = () => useCtx();

/**
 * Given a selector, get a LayoutNode object
 *
 * @param selector This can be one of:
 *  - A component-like structure, such as ILayoutComponent, or ILayoutCompInput. The 'id' property is used to find the
 *    corresponding LayoutNode object for you, while also inferring a more specific type (if you have one).
 *  - A component id, like 'currentValue-0' for the 'currentValue' component in the first row of the repeating group it
 *    belongs to. If you only provide 'currentValue', and the component is still inside a repeating group, most likely
 *    you'll get the first row item as a result.
 */
export function useResolvedNode<T>(selector: string | undefined | T | LayoutNode): LayoutNodeFromObj<T> | undefined {
  const nodes = useNodes();

  if (typeof selector === 'object' && selector !== null && selector instanceof BaseLayoutNode) {
    return selector as any;
  }

  if (typeof selector === 'string') {
    return nodes?.findById(selector) as any;
  }

  if (typeof selector == 'object' && selector !== null && 'id' in selector && typeof selector.id === 'string') {
    return nodes?.findById(selector.id) as any;
  }

  return undefined;
}

/**
 * This hook replaces checkIfConditionalRulesShouldRunSaga(), and fixes a problem that was hard to solve in sagas;
 * namely, that expressions that cause a component to suddenly be visible might also cause other component lookups
 * to start producing a value, so we don't really know how many times we need to run the expressions to reach
 * a stable state. As React hooks are...reactive, we can just run the expressions again when the data changes, and
 * thus continually run the expressions until they stabilize. You _could_ run into an infinite loop if you
 * have a circular dependency in your expressions, but that's a problem with your form, not this hook.
 */
function useLegacyHiddenComponents(resolvedNodes: LayoutPages | undefined) {
  const _currentHiddenFields = useAppSelector((state) => state.formLayout.uiConfig.hiddenFields);
  const formData = FD.useDebounced();
  const rules = useAppSelector((state) => state.formDynamics.conditionalRendering);
  const _dataSources = useAppSelector(selectDataSourcesFromState);
  const dataSources: HierarchyDataSources = useMemo(() => ({ ..._dataSources, formData }), [_dataSources, formData]);
  const { setHiddenPages, hidden } = usePageNavigationContext();
  const hiddenExpr = useHiddenLayoutsExpressions();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!resolvedNodes) {
      return;
    }

    const currentHiddenLayouts = new Set<string>(hidden);
    const futureHiddenLayouts = runExpressionsForLayouts(resolvedNodes, hiddenExpr, dataSources);

    if (shouldUpdate(currentHiddenLayouts, futureHiddenLayouts)) {
      setHiddenPages([...futureHiddenLayouts.values()]);
    }

    const currentHiddenFields = new Set(_currentHiddenFields);

    let futureHiddenFields: Set<string>;
    try {
      futureHiddenFields = runConditionalRenderingRules(rules, resolvedNodes);
    } catch (error) {
      window.logError('Error while evaluating conditional rendering rules:\n', error);
      futureHiddenFields = new Set();
    }

    runExpressionRules(resolvedNodes, futureHiddenFields);

    // Add all fields from hidden layouts to hidden fields
    for (const layout of futureHiddenLayouts) {
      for (const node of resolvedNodes.findLayout(layout)?.flat(true) || []) {
        if (!futureHiddenFields.has(node.item.id)) {
          futureHiddenFields.add(node.item.id);
        }
      }
    }

    if (shouldUpdate(currentHiddenFields, futureHiddenFields)) {
      const newlyHidden = Array.from(futureHiddenFields).filter((i) => !currentHiddenFields.has(i));
      const newlyVisible = Array.from(currentHiddenFields).filter((i) => !futureHiddenFields.has(i));
      dispatch(
        FormLayoutActions.updateHiddenComponents({
          newlyHidden,
          newlyVisible,
          componentsToHide: [...futureHiddenFields.values()],
        }),
      );
    }
  }, [_currentHiddenFields, dataSources, dispatch, hidden, hiddenExpr, resolvedNodes, rules, setHiddenPages]);
}
