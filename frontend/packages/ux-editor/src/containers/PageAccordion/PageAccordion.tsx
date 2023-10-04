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
 * @returns
 */
export const PageAccordion = ({
  pageName,
  children,
  isOpen,
  onClick,
}: PageAccordionProps): ReactNode => {
  return (
    <div className={classes.wrapper}>
      <div className={classes.accordion}>
        <Accordion color='neutral'>
          <Accordion.Item open={isOpen}>
            <Accordion.Header level={3} onHeaderClick={onClick}>
              {pageName}
            </Accordion.Header>
            <Accordion.Content>{children}</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
      <div className={classes.navigationMenu}>
        <NavigationMenu pageName={pageName} />
      </div>
    </div>
  );
};
