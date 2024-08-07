import React from 'react';

import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useGetPage } from 'src/utils/layout/NodesContext';
import type { CompSummary2External } from 'src/layout/Summary2/config.generated';

interface PageSummaryProps {
  pageId: string;
  summaryOverrides: CompSummary2External['overrides'];
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
