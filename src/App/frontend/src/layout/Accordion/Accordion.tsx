import React from 'react';

import { Accordion as AccordionLayout } from '@app/form-component';

import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import classes from 'src/layout/Accordion/Accordion.module.css';
import { useIsInAccordionGroup } from 'src/layout/AccordionGroup/AccordionGroupContext';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const Accordion = ({ baseComponentId }: PropsFromGenericComponent<'Accordion'>) => {
  const { textResourceBindings, children, openByDefault } = useItemWhenType(baseComponentId, 'Accordion');
  const canRender = useHasCapability('renderInAccordion');
  // Inside an AccordionGroup the group already provides the Card wrapper, so the
  // Accordion renders as a bare item instead.
  const renderAsAccordionItem = useIsInAccordionGroup();
  const {
    componentId,
    innerGrid,
    validationGrid,
    showValidationMessages,
  } = useComponentStructureData(baseComponentId);

  return (
    <AccordionLayout
      title={textResourceBindings?.title}
      openByDefault={Boolean(openByDefault)}
      renderAsItem={renderAsAccordionItem}
      className={classes.container}
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    >
      {children.filter(canRender).map((childId) => (
        <GenericComponent
          key={childId}
          baseComponentId={childId}
        />
      ))}
    </AccordionLayout>
  );
};
