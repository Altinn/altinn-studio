import React, { useState } from 'react';

import { Accordion } from '@digdir/designsystemet-react';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { Lang } from 'src/features/language/Lang';
import { usePageOrder } from 'src/hooks/useNavigatePage';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';
import { useTaskStore } from 'src/layout/Summary2/taskIdStore';

interface LayoutSetSummaryProps {
  pageKey?: string;
}

export function TaskSummaryAccordion({ pageKey, children }: React.PropsWithChildren<{ pageKey: string }>) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <Accordion
      border
      color={'neutral'}
    >
      <Accordion.Item
        key={pageKey}
        open={isOpen}
      >
        <Accordion.Header onHeaderClick={() => setIsOpen(!isOpen)}>
          <Lang id={pageKey} />
        </Accordion.Header>
        <Accordion.Content>{children}</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

export function LayoutSetSummary({ pageKey }: LayoutSetSummaryProps) {
  const pageOrder = usePageOrder();

  const { summaryItem } = useTaskStore((state) => ({
    summaryItem: state.summaryItem,
  }));

  const filteredPages = pageOrder.filter((layoutId) => {
    if (!pageKey) {
      return layoutId;
    }
    return layoutId === pageKey;
  });

  return filteredPages.map((layoutId, idx) => (
    <ConditionalWrapper
      key={idx}
      condition={!!summaryItem?.showPageInAccordion}
      wrapper={(children) => <TaskSummaryAccordion pageKey={layoutId}>{children}</TaskSummaryAccordion>}
    >
      <PageSummary
        pageId={layoutId}
        key={layoutId}
      />
    </ConditionalWrapper>
  ));
}
