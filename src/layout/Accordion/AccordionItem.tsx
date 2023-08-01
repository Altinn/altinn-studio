import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/design-system-react';

interface AccordionBaseComponentProps {
  title: string;
  children: React.ReactNode;
}

export const AccordionItem = ({ title, children }: AccordionBaseComponentProps): React.JSX.Element => (
  <DesignSystemAccordion.Item>
    <DesignSystemAccordion.Header>{title}</DesignSystemAccordion.Header>
    <DesignSystemAccordion.Content>{children}</DesignSystemAccordion.Content>
  </DesignSystemAccordion.Item>
);
