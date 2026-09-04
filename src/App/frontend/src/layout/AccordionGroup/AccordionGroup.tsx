import React from 'react';

import { Card } from '@digdir/designsystemet-react';

import classes from 'src/layout/AccordionGroup/AccordionGroup.module.css';
import { AccordionGroupProvider } from 'src/layout/AccordionGroup/AccordionGroupContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { PropsFromGenericComponent } from 'src/layout';

export const AccordionGroup = ({ baseComponentId }: PropsFromGenericComponent<'AccordionGroup'>) => {
  const children = useExternalItem(baseComponentId, 'AccordionGroup')?.children;

  return (
    <AccordionGroupProvider>
      <ComponentStructureWrapper baseComponentId={baseComponentId}>
        <Card
          className={classes.card}
          data-color='neutral'
        >
          {children?.map((id) => (
            <GenericComponent
              key={id}
              baseComponentId={id}
            />
          ))}
        </Card>
      </ComponentStructureWrapper>
    </AccordionGroupProvider>
  );
};
