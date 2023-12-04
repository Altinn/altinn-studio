import React, { ReactNode } from 'react';
import classes from './PageAccordion.module.css';
import cn from 'classnames';
import { Accordion } from '@digdir/design-system-react';
import { NavigationMenu } from './NavigationMenu';
import * as testids from '../../../../../../testing/testids';
import { DeletePopover } from './DeletePopover';

export type PageAccordionProps = {
  pageName: string;
  children: ReactNode;
  isOpen: boolean;
  onClick: () => void;
  pageIsReceipt?: boolean;
};

/**
 * @component
 *    Displays an accordion for a page, as well as a menu button where the user can
 *    move accordions, edit the name on them and delete them
 *
 * @property {string}[pageName] - The name of the page
 * @property {ReactNode}[children] - The children of the component
 * @property {boolean}[isOpen] - If the accordion is open or not
 * @property {function}[onClick] - Function to execute when the accordion is clicked
 * @property {boolean}[pageIsReceipt] - If the page is receipt or not
 *
 * @returns {ReactNode} - The rendered component
 */
export const PageAccordion = ({
  pageName,
  children,
  isOpen,
  onClick,
  pageIsReceipt,
}: PageAccordionProps): ReactNode => {
  return (
    <Accordion.Item
      className={cn(classes.accordionItem, pageIsReceipt && classes.receiptItem)}
      open={isOpen}
    >
      <div className={classes.accordionHeaderRow}>
        <Accordion.Header className={classes.accordionHeader} level={3} onHeaderClick={onClick}>
          {pageName}
        </Accordion.Header>
        <div className={classes.navigationMenu}>
          <NavigationMenu pageName={pageName} pageIsReceipt={pageIsReceipt} />
          <DeletePopover pageName={pageName} />
        </div>
      </div>
      <Accordion.Content
        data-testid={testids.pageAccordionContent(pageName)}
        className={classes.accordionContent}
      >
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
};
