import React from 'react';

import { usePageOrder } from 'src/hooks/useNavigatePage';
import { LayoutSetSummaryAccordion } from 'src/layout/Summary2/CommonSummaryComponents/LayoutSetSummaryAccordion';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';

type LayoutSetSummaryProps = {
  pageKey?: string;
};

export function LayoutSetSummary({ pageKey }: LayoutSetSummaryProps) {
  const pageOrder = usePageOrder();
  const showPageInAccordion = useSummaryProp('showPageInAccordion');

  const filteredPages = pageOrder.filter((layoutId) => {
    if (!pageKey) {
      return layoutId;
    }
    return layoutId === pageKey;
  });

  if (showPageInAccordion) {
    return <LayoutSetSummaryAccordion filteredPages={filteredPages} />;
  }

  return filteredPages.map((layoutId) => (
    <EmptyChildrenBoundary key={layoutId}>
      <PageSummary pageId={layoutId} />
    </EmptyChildrenBoundary>
  ));
}
