import React from 'react';

import { useOrder } from 'src/hooks/useNavigatePage';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';

interface LayoutSetSummaryProps {
  layoutSetId?: string;
}

export function LayoutSetSummary({ layoutSetId }: LayoutSetSummaryProps) {
  const pageOrder = useOrder();

  const filteredPages = pageOrder.filter((layoutId) => {
    if (!layoutSetId) {
      return layoutId;
    }
    return layoutId === layoutSetId;
  });

  return filteredPages.map((layoutId) => (
    <PageSummary
      pageId={layoutId}
      key={layoutId}
      summaryOverrides={undefined} // FIXME: should have overrides? From where?
    />
  ));
}
