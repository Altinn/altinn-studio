import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/design-system-react';

import { SummaryAccordionComponent } from 'src/layout/Accordion/SummaryAccordion';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

interface ISummaryAccordionComponentProps {
  changeText: string | null;
  onChangeClick: () => void;
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNodeFromType<'AccordionGroup'>;
  overrides?: ISummaryComponent['overrides'];
}

export const SummaryAccordionGroupComponent = ({ targetNode, ...rest }: ISummaryAccordionComponentProps) => (
  <DesignSystemAccordion>
    {targetNode.item.childComponents.map((n: LayoutNodeFromType<'Accordion'>) => (
      <SummaryAccordionComponent
        key={n.item.id}
        targetNode={n}
        {...rest}
      />
    ))}
  </DesignSystemAccordion>
);
