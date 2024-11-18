import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/designsystemet-react';

import { SummaryAccordionComponent } from 'src/layout/Accordion/SummaryAccordion';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const SummaryAccordionGroupComponent = ({ targetNode, ...rest }: SummaryRendererProps<'AccordionGroup'>) => {
  const { childComponents } = useNodeItem(targetNode);
  return (
    <DesignSystemAccordion>
      {childComponents.map((childId) => (
        <Child
          key={childId}
          id={childId}
          {...rest}
        />
      ))}
    </DesignSystemAccordion>
  );
};

function Child({ id, ...rest }: { id: string } & Omit<SummaryRendererProps<'AccordionGroup'>, 'targetNode'>) {
  const targetNode = useNode(id) as LayoutNode<'Accordion'> | undefined;
  if (!targetNode) {
    return null;
  }

  return (
    <SummaryAccordionComponent
      key={targetNode.id}
      targetNode={targetNode}
      {...rest}
    />
  );
}
