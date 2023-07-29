import type { HTMLAttributes } from 'react';
import React, { forwardRef, useContext } from 'react';
import cn from 'classnames';
import { AccordionItemContext } from '../AccordionItem';
import classes from '../Accordion.module.css';

export type AccordionContentProps = {
  children?: React.ReactNode | React.ReactNode[],
} & HTMLAttributes<HTMLDivElement>;

// TODO : Replace by Accordion component from @digdir/design-system-react when autoresize is fixed
export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className, ...rest }, ref) => {
    const context = useContext(AccordionItemContext);

    if (context === null) {
      console.error(
        '<Accordion.Content> has to be used within an <Accordion.Item>',
      );
      return null;
    }

    return (
      <div
        className={cn(classes.content, className)}
        ref={ref}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

AccordionContent.displayName = 'Accordion.Content';
