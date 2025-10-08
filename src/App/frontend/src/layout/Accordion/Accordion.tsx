import React from 'react';

import { Card } from '@digdir/designsystemet-react';

import { AccordionItem as AccordionComponent } from 'src/app-components/Accordion/AccordionItem';
import { Flex } from 'src/app-components/Flex/Flex';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Accordion/Accordion.module.css';
import { useIsInAccordionGroup } from 'src/layout/AccordionGroup/AccordionGroupContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const Accordion = ({ baseComponentId }: PropsFromGenericComponent<'Accordion'>) => {
  const { textResourceBindings, children, openByDefault } = useItemWhenType(baseComponentId, 'Accordion');
  const { langAsString } = useLanguage();
  const canRender = useHasCapability('renderInAccordion');
  const renderAsAccordionItem = useIsInAccordionGroup();

  const title = langAsString(textResourceBindings?.title ?? '');

  const AccordionContent = ({ className }: { className?: string }) => (
    <AccordionComponent
      title={title}
      className={className}
      defaultOpen={Boolean(openByDefault)}
    >
      <Flex
        item
        container
        spacing={6}
        alignItems='flex-start'
      >
        {children.filter(canRender).map((id) => (
          <GenericComponent
            key={id}
            baseComponentId={id}
          />
        ))}
      </Flex>
    </AccordionComponent>
  );

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      {renderAsAccordionItem ? (
        <AccordionContent className={classes.container} />
      ) : (
        <Card data-color='neutral'>
          <AccordionContent className={classes.container} />
        </Card>
      )}
    </ComponentStructureWrapper>
  );
};
