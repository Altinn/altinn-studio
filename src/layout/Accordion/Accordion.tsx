import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';

import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Accordion/Accordion.module.css';
import { AccordionItem } from 'src/layout/Accordion/AccordionItem';
import { GenericComponent } from 'src/layout/GenericComponent';
import type { PropsFromGenericComponent } from 'src/layout';

type IAccordionProps = PropsFromGenericComponent<'Accordion'>;

export const Accordion = ({ node }: IAccordionProps) => {
  const { textResourceBindings, renderAsAccordionItem, headingLevel } = node.item;
  const { langAsString } = useLanguage();

  const title = langAsString(textResourceBindings?.title ?? '');

  if (renderAsAccordionItem) {
    return (
      <AccordionItem
        title={title}
        className={classes.container}
        headingLevel={headingLevel}
      >
        <Grid
          item={true}
          container={true}
          spacing={3}
          alignItems='flex-start'
        >
          {node.item.childComponents.map((n) => (
            <GenericComponent
              key={n.item.id}
              node={n}
            />
          ))}
        </Grid>
      </AccordionItem>
    );
  }

  return (
    <DesignSystemAccordion
      color='subtle'
      border
      className={classes.container}
    >
      <AccordionItem
        title={title}
        headingLevel={headingLevel}
      >
        <Grid
          item={true}
          container={true}
          spacing={3}
          alignItems='flex-start'
        >
          {node.item.childComponents.map((n) => (
            <GenericComponent
              key={n.item.id}
              node={n}
            />
          ))}
        </Grid>
      </AccordionItem>
    </DesignSystemAccordion>
  );
};
