import React from 'react';

import { Accordion, Label } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Summary2/CommonSummaryComponents/LayoutSetSummaryAccordion.module.css';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';

type LayoutSetAccordionSummaryProps = {
  filteredPages: string[];
};

export function LayoutSetSummaryAccordion({ filteredPages }: LayoutSetAccordionSummaryProps) {
  return (
    <Accordion
      border
      color='neutral'
      className={classes.summaryItem}
    >
      {filteredPages.map((layoutId: string) => (
        <Accordion.Item
          key={layoutId}
          defaultOpen={true}
        >
          <Accordion.Header level={2}>
            <Label asChild>
              <span>
                <Lang id={layoutId} />
              </span>
            </Label>
          </Accordion.Header>
          <Accordion.Content>
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
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
