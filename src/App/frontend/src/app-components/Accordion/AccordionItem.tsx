import React from 'react';

import { Details } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from 'src/app-components/Accordion/AccordionItem.module.css';

interface AccordionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export const AccordionItem = ({
  title,
  children,
  className,
  open,
  defaultOpen = false,
  onToggle,
}: AccordionProps): React.JSX.Element => {
  const [isOpen, setOpen] = React.useState(defaultOpen);

  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : isOpen;

  const handleToggle = () => {
    const newOpen = !currentOpen;
    if (!isControlled) {
      setOpen(newOpen);
    }
    onToggle?.(newOpen);
  };

  return (
    <Details
      open={currentOpen}
      onToggle={handleToggle}
      className={cn(className, classes.accordion)}
    >
      <Details.Summary>{title}</Details.Summary>
      <Details.Content>{children}</Details.Content>
    </Details>
  );
};
