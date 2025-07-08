import React from 'react';

import { Card } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Accordion/Accordion.module.css';
import { AccordionItem as AltinnAcordionItem } from 'src/layout/Accordion/AccordionItem';
import { useIsInAccordionGroup } from 'src/layout/AccordionGroup/AccordionGroupContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponentByBaseId } from 'src/layout/GenericComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const Accordion = ({ baseComponentId }: PropsFromGenericComponent<'Accordion'>) => {
  const { textResourceBindings, children, openByDefault } = useItemWhenType(baseComponentId, 'Accordion');
  const { langAsString } = useLanguage();
  const canRender = useHasCapability('renderInAccordion');
  const renderAsAccordionItem = useIsInAccordionGroup();

  const title = langAsString(textResourceBindings?.title ?? '');

  const AccordionItem = ({ className }: { className?: string }) => (
    <AltinnAcordionItem
      title={title}
      className={className}
      open={openByDefault}
    >
      <Flex
        item
        container
        spacing={6}
        alignItems='flex-start'
      >
        {children.filter(canRender).map((id) => (
          <GenericComponentByBaseId
            key={id}
            id={id}
          />
        ))}
      </Flex>
    </AltinnAcordionItem>
  );

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      {renderAsAccordionItem ? (
        <AccordionItem className={classes.container} />
      ) : (
        <Card data-color='neutral'>
          <AccordionItem className={classes.container} />
        </Card>
      )}
    </ComponentStructureWrapper>
  );
};
