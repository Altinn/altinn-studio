import React from 'react';

import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';

interface PageSummaryProps {
  pageId: string;
}

export function PageSummary({ pageId }: PageSummaryProps) {
  const page = useNodeTraversal((dings) => dings.findPage(pageId));
  const children = useNodeTraversal((t) => t.children(), page);

  if (!page) {
    throw new Error('PageId invalid in PageSummary.');
  }

  return children?.map((child, idx) => (
    <ComponentSummary
      componentNode={child}
      key={`${child.id}-${idx}`}
    />
  ));
}
