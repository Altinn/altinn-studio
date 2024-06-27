import React from 'react';

import { useOrder } from 'src/hooks/useNavigatePage';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';

interface LayoutSetSummaryProps {
  layoutSetId?: string;
  summaryOverrides?: any;
}

export function LayoutSetSummary({ layoutSetId, summaryOverrides }: LayoutSetSummaryProps) {
  const pageOrder = useOrder();

  return pageOrder
    .filter((layoutId) => {
      if (!layoutSetId) {
        return layoutId;
      }
      return layoutId === layoutSetId;
    })
    .map((layoutId) => (
      <PageSummary
        pageId={layoutId}
        key={layoutId}
        summaryOverrides={summaryOverrides}
      />
    ));
}
