import { useMemo } from 'react';

import { CompCategory } from 'src/layout/common';
import { useNodeDirectChildren, useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

export function useTableNodes(node: LayoutNode<'RepeatingGroup'>, restriction: TraversalRestriction) {
  const tableHeaders = useNodeItem(node, (item) => item.tableHeaders);
  const children = useNodeDirectChildren(node, restriction);

  return useMemo(() => {
    const nodes = children.filter((child) =>
      tableHeaders ? tableHeaders.includes(child.baseId) : child.isCategory(CompCategory.Form),
    );

    // Sort using the order from tableHeaders
    if (tableHeaders) {
      nodes.sort((a, b) => {
        const aIndex = tableHeaders.indexOf(a.baseId);
        const bIndex = tableHeaders.indexOf(b.baseId);
        return aIndex - bIndex;
      });
    }

    return nodes;
  }, [children, tableHeaders]);
}
