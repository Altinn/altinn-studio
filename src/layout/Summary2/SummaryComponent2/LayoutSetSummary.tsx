import React from 'react';

import { usePageOrder } from 'src/hooks/useNavigatePage';
import { LayoutSetSummaryAccordion } from 'src/layout/Summary2/CommonSummaryComponents/LayoutSetSummaryAccordion';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';
import { useSummary2Store } from 'src/layout/Summary2/summaryStoreContext';

type LayoutSetSummaryProps = {
  pageKey?: string;
};

export function LayoutSetSummary({ pageKey }: LayoutSetSummaryProps) {
  const pageOrder = usePageOrder();

  const { summaryItem } = useSummary2Store((state) => ({
    summaryItem: state.summaryItem,
  }));

  const filteredPages = pageOrder.filter((layoutId) => {
    if (!pageKey) {
      return layoutId;
    }
    return layoutId === pageKey;
  });

  if (summaryItem?.showPageInAccordion) {
    return <LayoutSetSummaryAccordion filteredPages={filteredPages} />;
  }

  return filteredPages.map((layoutId) => (
    <PageSummary
      pageId={layoutId}
      key={layoutId}
    />
  ));
}
