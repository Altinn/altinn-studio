import React from 'react';

import { GenericComponent } from 'src/layout/GenericComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type IAccordionGroupProps = PropsFromGenericComponent<'AccordionGroup'>;

export const AccordionGroup = ({ node }: IAccordionGroupProps) => (
  <>
    {node.item.childComponents.map((n: LayoutNode<'Accordion'>) => (
      <GenericComponent<'Accordion'>
        key={n.item.id}
        node={n}
        overrideItemProps={{
          renderAsAccordionItem: true,
        }}
      />
    ))}
  </>
);
