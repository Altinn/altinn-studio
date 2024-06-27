import React from 'react';

import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useGetPage } from 'src/utils/layout/NodesContext';

interface PageSummaryProps {
  pageId: string;
  summaryOverrides: any;
}

export function PageSummary({ pageId, summaryOverrides }: PageSummaryProps) {
  const page = useGetPage(pageId);
  if (!page) {
    throw new Error('PageId invalid in PageSummary.');
  }

  return page.children().map((child) => (
    <ComponentSummary
      componentNode={child}
      key={child.item.id}
      summaryOverrides={summaryOverrides}
    />
  ));
}
