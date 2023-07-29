import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './Accordion.module.css';

export type AccordionProps = {
  /** Instances of `Accordion.Item` */
  children: React.ReactNode;
} & HTMLAttributes<HTMLDivElement>;

// TODO : Replace by Accordion component from @digdir/design-system-react when autoresize is fixed
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  ({ children, className, ...rest }, ref) => (
    <div
      className={cn(classes.accordion, className)}
      ref={ref}
      {...rest}
    >
      {children}
    </div>
  )
);

Accordion.displayName = 'Accordion';
