import { useState } from 'react';
import type { ReactNode } from 'react';

import { Details } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from './AccordionItem.module.css';

export type AccordionItemProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
};

export function AccordionItem({
  title,
  children,
  className,
  open,
  defaultOpen = false,
  onToggle,
}: AccordionItemProps) {
  const [isOpen, setOpen] = useState(defaultOpen);

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
}
