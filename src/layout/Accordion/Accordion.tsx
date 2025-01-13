import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Accordion/Accordion.module.css';
import { AccordionItem as AltinnAcordionItem } from 'src/layout/Accordion/AccordionItem';
import { useIsInAccordionGroup } from 'src/layout/AccordionGroup/AccordionGroupContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

type IAccordionProps = PropsFromGenericComponent<'Accordion'>;

export const Accordion = ({ node }: IAccordionProps) => {
  const { textResourceBindings, headingLevel, childComponents, openByDefault } = useNodeItem(node);
  const { langAsString } = useLanguage();
  const renderAsAccordionItem = useIsInAccordionGroup();

  const title = langAsString(textResourceBindings?.title ?? '');

  const AccordionItem = ({ className }: { className?: string }) => (
    <AltinnAcordionItem
      title={title}
      className={className}
      headingLevel={headingLevel}
      open={openByDefault}
    >
      <Flex
        item
        container
        spacing={6}
        alignItems='flex-start'
      >
        {childComponents.map((id) => (
          <GenericComponentById
            key={id}
            id={id}
          />
        ))}
      </Flex>
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
