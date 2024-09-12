import React from 'react';

import { Accordion, Label } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Summary2/CommonSummaryComponents/LayoutSetSummaryAccordion.module.css';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';

type LayoutSetAccordionSummaryProps = {
  filteredPages: string[];
};

export function LayoutSetSummaryAccordion({ filteredPages }: LayoutSetAccordionSummaryProps) {
  return (
    <Accordion
      border
      color={'neutral'}
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
            <Grid
              container={true}
              spacing={6}
              alignItems='flex-start'
            >
              <PageSummary
                pageId={layoutId}
                key={layoutId}
              />
            </Grid>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
