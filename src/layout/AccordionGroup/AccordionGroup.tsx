import React from 'react';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type IAccordionGroupProps = PropsFromGenericComponent<'AccordionGroup'>;

export const AccordionGroup = ({ node }: IAccordionGroupProps) => (
  <ComponentStructureWrapper node={node}>
    {node.item.childComponents.map((n: LayoutNode<'Accordion'>) => (
      <GenericComponent<'Accordion'>
        key={n.item.id}
        node={n}
        overrideItemProps={{
          renderAsAccordionItem: true,
        }}
      />
    ))}
  </ComponentStructureWrapper>
);
