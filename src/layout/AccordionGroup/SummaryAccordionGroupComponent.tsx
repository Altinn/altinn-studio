import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/designsystemet-react';

import { SummaryAccordionComponent } from 'src/layout/Accordion/SummaryAccordion';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const SummaryAccordionGroupComponent = ({ targetNode, ...rest }: SummaryRendererProps<'AccordionGroup'>) => {
  const { childComponents } = useNodeItem(targetNode);
  return (
    <DesignSystemAccordion>
      {childComponents.map((targetNode) => {
        if (!targetNode) {
          return null;
        }

        return (
          <SummaryAccordionComponent
            key={targetNode.id}
            targetNode={targetNode as LayoutNode<'Accordion'>}
            {...rest}
          />
        );
      })}
    </DesignSystemAccordion>
  );
};
