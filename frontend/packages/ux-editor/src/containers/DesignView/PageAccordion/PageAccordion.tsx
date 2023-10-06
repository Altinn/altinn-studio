import React, { ReactNode } from 'react';
import classes from './PageAccordion.module.css';
import { Accordion } from '@digdir/design-system-react';
import { NavigationMenu } from './NavigationMenu';

export type PageAccordionProps = {
  /**
   * The name of the page
   */
  pageName: string;
  /**
   * The children of the component
   */
  children: ReactNode;
  /**
   * If the accordion is open or not
   */
  isOpen: boolean;
  /**
   * Function to execute when the accordion is clicked
   * @returns void
   */
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
    <Accordion.Item className={classes.accordionItem} open={isOpen}>
      <div className={classes.accordionHeaderRow}>
        <Accordion.Header className={classes.accordionHeader} level={3} onHeaderClick={onClick}>
          {pageName}
        </Accordion.Header>
        <div className={classes.navigationMenu}>
          <NavigationMenu pageName={pageName} pageIsReceipt={pageIsReceipt} />
        </div>
      </div>
      <Accordion.Content className={classes.accordionContent}>{children}</Accordion.Content>
    </Accordion.Item>
  );
};
