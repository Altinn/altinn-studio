import React from 'react';
import classes from './PageAccordion.module.css';
import { FormLayout } from '../types';
import { Accordion, Paragraph } from '@digdir/design-system-react';
import { PageAccordionItem } from './PageAccordionItem';
import { BASE_CONTAINER_ID } from 'app-shared/constants';

export type PageAccordionProps = {
  formLayout: FormLayout;
  onHeaderClick: () => void;
  accordionOpen: boolean;
};

export const PageAccordion = ({ formLayout, onHeaderClick, accordionOpen }: PageAccordionProps) => {
  // TODO - Drag and drop in to this menu

  const orderItems = formLayout.data.order[BASE_CONTAINER_ID];

  const displayPageAccordionItem = orderItems?.length ? (
    orderItems.map((itemId: string, itemIndex: number) => {
      return (
        <PageAccordionItem
          key={itemIndex}
          // id={itemId}
          component={formLayout.data.components[itemId]}
          // handleSave ??
          // debounceSave ??
          // handleDiscard ??
        />
      );
    })
  ) : (
    <Paragraph size='small'>Du har ingen komponent på denne siden </Paragraph>
  );

  return (
    <Accordion color='neutral'>
      <Accordion.Item defaultOpen={accordionOpen}>
        <Accordion.Header level={3} onHeaderClick={onHeaderClick}>
          {formLayout.page}
        </Accordion.Header>
        <Accordion.Content className={classes.accordionContent}>
          {displayPageAccordionItem}
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
};
