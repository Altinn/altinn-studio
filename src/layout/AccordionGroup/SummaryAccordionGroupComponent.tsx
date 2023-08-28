import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/design-system-react';

import { SummaryAccordionComponent } from 'src/layout/Accordion/SummaryAccordion';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface ISummaryAccordionComponentProps {
  changeText: string | null;
  onChangeClick: () => void;
  summaryNode: LayoutNode<'Summary'>;
  targetNode: LayoutNode<'AccordionGroup'>;
  overrides?: ISummaryComponent['overrides'];
}

export const SummaryAccordionGroupComponent = ({ targetNode, ...rest }: ISummaryAccordionComponentProps) => (
  <DesignSystemAccordion>
    {targetNode.item.childComponents.map((n: LayoutNode<'Accordion'>) => (
      <SummaryAccordionComponent
        key={n.item.id}
        targetNode={n}
        {...rest}
      />
    ))}
  </DesignSystemAccordion>
);
