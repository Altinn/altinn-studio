import React from 'react';

import { AccordionItem } from 'src/app-components/Accordion/AccordionItem';
import { Flex } from 'src/app-components/Flex/Flex';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Summary2/CommonSummaryComponents/LayoutSetSummaryAccordion.module.css';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';

type LayoutSetAccordionSummaryProps = {
  filteredPages: string[];
};

export function LayoutSetSummaryAccordion({ filteredPages }: LayoutSetAccordionSummaryProps) {
  return filteredPages.map((layoutId: string) => (
    <AccordionItem
      key={layoutId}
      defaultOpen={true}
      className={classes.summaryItem}
      title={<Lang id={layoutId} />}
    >
      <Flex
        container
        spacing={6}
        alignItems='flex-start'
      >
        <EmptyChildrenBoundary>
          <PageSummary
            pageId={layoutId}
            key={layoutId}
          />
        </EmptyChildrenBoundary>
      </Flex>
    </AccordionItem>
  ));
}
