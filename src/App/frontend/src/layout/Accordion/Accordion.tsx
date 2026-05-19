import React from 'react';

import { AccordionItem, Flex } from '@app/form-component';
import { Card } from '@digdir/designsystemet-react';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/layout/Accordion/Accordion.module.css';
import { useIsInAccordionGroup } from 'src/layout/AccordionGroup/AccordionGroupContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const Accordion = ({ baseComponentId }: PropsFromGenericComponent<'Accordion'>) => {
  const { textResourceBindings, children, openByDefault } = useItemWhenType(baseComponentId, 'Accordion');
  const canRender = useHasCapability('renderInAccordion');
  const renderAsAccordionItem = useIsInAccordionGroup();
  const { TranslateComponent } = useTranslation();

  const title = textResourceBindings?.title ?? '';

  const AccordionContent = ({ className }: { className?: string }) => (
    <AccordionItem
      title={<TranslateComponent tKey={title} />}
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
    </AccordionItem>
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
