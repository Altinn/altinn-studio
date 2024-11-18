import React from 'react';

import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';
import { typedBoolean } from 'src/utils/typing';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface PageSummaryProps {
  pageId: string;
}

export function PageSummary({ pageId }: PageSummaryProps) {
  const page = useNodeTraversal((dings) => dings.findPage(pageId));
  const children = useNodeTraversal((t) => t.children(), page) as (LayoutNode | undefined)[];
  const isHiddenPage = Hidden.useIsHiddenPage(page);

  if (!page || !children) {
    throw new Error('PageId invalid in PageSummary.');
  }

  if (isHiddenPage) {
    return null;
  }

  return children?.filter(typedBoolean).map((child, idx) => (
    <ComponentSummary
      componentNode={child}
      key={`${child.id}-${idx}`}
    />
  ));
}
