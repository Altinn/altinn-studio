import type { HTMLAttributes } from 'react';
import React, { createContext, useState, useId, forwardRef } from 'react';
import cn from 'classnames';
import classes from '../Accordion.module.css';

export type AccordionItemProps = {
  /**
   * Controls open-state.
   *
   * Using this removes automatic control of open-state
   */
  open?: boolean;
  /**  Defaults the accordion to open if not controlled */
  defaultOpen?: boolean;
  /** Content should be one `<Accordion.Header>` and `<Accordion.Content>` */
  children: React.ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export type AccordionItemContextProps = {
  open: boolean;
  toggleOpen: () => void;
  contentId: string;
};

export const AccordionItemContext =
  createContext<AccordionItemContextProps | null>(null);

// TODO : Replace by Accordion component from @digdir/design-system-react when autoresize is fixed
export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ children, className, open, defaultOpen = false, ...rest }, ref) => {
    const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen);
    const contentId = useId();

    return (
      <div
        className={cn(classes.item, className, (open ?? internalOpen) && classes.open)}
        ref={ref}
        {...rest}
      >
        <AccordionItemContext.Provider
          value={{
            open: open ?? internalOpen,
            toggleOpen: () => {
              if (open === undefined) {
                setInternalOpen((isOpen) => !isOpen);
              }
            },
            contentId: contentId,
          }}
        >
          {children}
        </AccordionItemContext.Provider>
      </div>
    );
  }
);

AccordionItem.displayName = 'Accordion.Item';
