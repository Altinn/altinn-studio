import React from 'react';

import { AccordionItem } from '@app/form-component/src/app-components/AccordionItem/AccordionItem';
import { Flex } from '@app/form-component/src/app-components/Flex/Flex';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/layout/Summary2/CommonSummaryComponents/LayoutSetSummaryAccordion.module.css';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';

type LayoutSetAccordionSummaryProps = {
  filteredPages: string[];
};

export function LayoutSetSummaryAccordion({ filteredPages }: LayoutSetAccordionSummaryProps) {
  const { TranslateComponent } = useTranslation();

  return filteredPages.map((layoutId: string) => (
    <AccordionItem
      key={layoutId}
      defaultOpen={true}
      className={classes.summaryItem}
      title={<TranslateComponent tKey={layoutId} />}
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
