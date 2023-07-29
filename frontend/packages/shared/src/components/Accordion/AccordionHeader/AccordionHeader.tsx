import type { HTMLAttributes, MouseEventHandler } from 'react';
import React, { forwardRef, useContext } from 'react';
import cn from 'classnames';
import { ChevronDownIcon, ChevronRightIcon } from '@navikt/aksel-icons';
import classes from '../Accordion.module.css';
import { AccordionItemContext } from '../AccordionItem';

export type AccordionHeaderProps = {
  onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
  children: React.ReactNode;
} & HTMLAttributes<HTMLButtonElement>;

// TODO : Replace by Accordion component from @digdir/design-system-react when autoresize is fixed
export const AccordionHeader = forwardRef<HTMLButtonElement, AccordionHeaderProps>(
  ({ children, className, onClick, ...rest }, ref) => {
    const context = useContext(AccordionItemContext);

    if (context === null) {
      console.error(
        '<Accordion.Header> has to be used within an <Accordion.Item>',
      );
      return null;
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      context.toggleOpen();
      onClick && onClick(e);
    };

    return (
      <button
        type='button'
        onClick={handleClick}
        className={cn(classes.header, className)}
        aria-expanded={context.open}
        aria-controls={context.contentId}
        ref={ref}
        {...rest}
      >
        {
          context.open
          ? (<ChevronDownIcon className={classes.toggleIcon} />)
          : (<ChevronRightIcon className={classes.toggleIcon} />)
        }
        {children}
      </button>
    );
  }
);

AccordionHeader.displayName = 'Accordion.Header';
