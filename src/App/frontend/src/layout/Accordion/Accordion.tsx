import React from 'react';

import { Accordion as AccordionLayout } from '@app/form-component';

import classes from 'src/layout/Accordion/Accordion.module.css';
import { useIsInAccordionGroup } from 'src/layout/AccordionGroup/AccordionGroupContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const Accordion = ({ baseComponentId }: PropsFromGenericComponent<'Accordion'>) => {
  const { id, textResourceBindings, children, openByDefault } = useItemWhenType(baseComponentId, 'Accordion');
  const canRender = useHasCapability('renderInAccordion');
  // Inside an AccordionGroup the group already provides the Card wrapper, so the
  // Accordion renders as a bare item instead.
  const renderAsAccordionItem = useIsInAccordionGroup();

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <AccordionLayout
        id={id}
        title={textResourceBindings?.title}
        openByDefault={Boolean(openByDefault)}
        renderAsCard={!renderAsAccordionItem}
        className={classes.container}
      >
        {children.filter(canRender).map((childId) => (
          <GenericComponent
            key={childId}
            baseComponentId={childId}
          />
        ))}
      </AccordionLayout>
    </ComponentStructureWrapper>
  );
};
