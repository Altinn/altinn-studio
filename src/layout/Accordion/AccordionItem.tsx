import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/design-system-react';
import cn from 'classnames';

import classes from 'src/layout/Accordion/Accordion.module.css';
import type { HeadingLevel } from 'src/layout/common.generated';

interface AccordionBaseComponentProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headingLevel?: HeadingLevel;
}

export const AccordionItem = ({
  title,
  children,
  className,
  headingLevel = 2,
}: AccordionBaseComponentProps): React.JSX.Element => (
  <DesignSystemAccordion.Item className={cn(className, classes.accordion)}>
    <DesignSystemAccordion.Header level={headingLevel}>{title}</DesignSystemAccordion.Header>
    <DesignSystemAccordion.Content>{children}</DesignSystemAccordion.Content>
  </DesignSystemAccordion.Item>
);
