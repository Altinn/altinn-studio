import React from 'react';

import { Details, Label } from '@digdir/designsystemet-react';

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
    <Details
      key={layoutId}
      defaultOpen={true}
      color='neutral'
      className={classes.summaryItem}
    >
      <Details>
        <Details.Summary>
          <Label asChild>
            <span>
              <Lang id={layoutId} />
            </span>
          </Label>
        </Details.Summary>
        <Details.Content>
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
        </Details.Content>
      </Details>
    </Details>
  ));
}
