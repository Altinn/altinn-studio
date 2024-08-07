import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Accordion/Accordion.module.css';
import { AccordionItem as AltinnAcordionItem } from 'src/layout/Accordion/AccordionItem';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import type { PropsFromGenericComponent } from 'src/layout';

type IAccordionProps = PropsFromGenericComponent<'Accordion'>;

export const Accordion = ({ node }: IAccordionProps) => {
  const { textResourceBindings, renderAsAccordionItem, headingLevel } = node.item;
  const { langAsString } = useLanguage();

  const title = langAsString(textResourceBindings?.title ?? '');

  const AccordionItem = ({ className }: { className?: string }) => (
    <AltinnAcordionItem
      title={title}
      className={className}
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
    </AltinnAcordionItem>
  );

  return (
    <ComponentStructureWrapper node={node}>
      {renderAsAccordionItem ? (
        <AccordionItem className={classes.container} />
      ) : (
        <DesignSystemAccordion
          color='subtle'
          border
          className={classes.container}
        >
          <AccordionItem />
        </DesignSystemAccordion>
      )}
    </ComponentStructureWrapper>
  );
};
