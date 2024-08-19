import React from 'react';

import { Accordion as DesignSystemAccordion } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from 'src/layout/Accordion/Accordion.module.css';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { HeadingLevel } from 'src/layout/common.generated';

interface AccordionBaseComponentProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headingLevel?: HeadingLevel;
  open?: ExprValToActualOrExpr<ExprVal.Boolean>;
}

export const AccordionItem = ({
  title,
  children,
  className,
  headingLevel = 2,
  open,
}: AccordionBaseComponentProps): React.JSX.Element => {
  const [isOpen, setOpen] = React.useState(open);

  const handleHeaderClick = () => {
    setOpen(!isOpen);
  };
  return (
    <DesignSystemAccordion.Item
      open={isOpen as boolean}
      className={cn(className, classes.accordion)}
    >
      <DesignSystemAccordion.Header
        level={headingLevel}
        onHeaderClick={handleHeaderClick}
      >
        {title}
      </DesignSystemAccordion.Header>
      <DesignSystemAccordion.Content>{children}</DesignSystemAccordion.Content>
    </DesignSystemAccordion.Item>
  );
};
