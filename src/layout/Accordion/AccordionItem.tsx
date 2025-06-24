import React from 'react';

import { Details } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from 'src/layout/Accordion/Accordion.module.css';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';

interface AccordionBaseComponentProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  open?: ExprValToActualOrExpr<ExprVal.Boolean>;
}

export const AccordionItem = ({ title, children, className, open }: AccordionBaseComponentProps): React.JSX.Element => {
  const [isOpen, setOpen] = React.useState(open);

  return (
    <Details
      open={isOpen as boolean}
      onToggle={() => {
        setOpen(!isOpen);
      }}
      className={cn(className, classes.accordion)}
    >
      <Details.Summary>{title}</Details.Summary>
      <Details.Content>{children}</Details.Content>
    </Details>
  );
};
