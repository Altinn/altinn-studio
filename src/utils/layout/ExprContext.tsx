import React, { useContext } from 'react';

import { _private, LayoutNode } from 'src/utils/layout/hierarchy';
import type { LayoutPages } from 'src/utils/layout/hierarchy';
import type { LayoutNodeFromObj } from 'src/utils/layout/hierarchy.types';

export const ExprContext = React.createContext<LayoutPages | undefined>(undefined);

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

export const ExprContextWrapper = (props: React.PropsWithChildren) => {
  const resolvedNodes = useLayoutsAsNodes();

  return <ExprContext.Provider value={resolvedNodes}>{props.children}</ExprContext.Provider>;
};

/**
 * Use the expression context. This will return a LayoutPages object containing the full tree of resolved
 * nodes (meaning, instances of layout components in a tree, with their expressions evaluated and resolved to
 * scalar values).
 *
 * Usually, if you're looking for a specific component/node, useResolvedNode() is better.
 */
export const useExprContext = () => useContext(ExprContext);

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
  const context = useExprContext();

  if (typeof selector === 'object' && selector !== null && selector instanceof LayoutNode) {
    return selector as any;
  }

  if (typeof selector === 'string') {
    return context?.findById(selector) as any;
  }

  if (typeof selector == 'object' && selector !== null && 'id' in selector && typeof selector.id === 'string') {
    return context?.findById(selector.id) as any;
  }

  return undefined;
}
