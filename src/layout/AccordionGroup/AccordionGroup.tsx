import React from 'react';

import { AccordionGroupProvider } from 'src/layout/AccordionGroup/AccordionGroupContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

type IAccordionGroupProps = PropsFromGenericComponent<'AccordionGroup'>;

export const AccordionGroup = ({ node }: IAccordionGroupProps) => {
  const { childComponents } = useNodeItem(node);

  return (
    <AccordionGroupProvider>
      <ComponentStructureWrapper node={node}>
        {childComponents.map((id) => (
          <GenericComponentById
            key={id}
            id={id}
          />
        ))}
      </ComponentStructureWrapper>
    </AccordionGroupProvider>
  );
};
