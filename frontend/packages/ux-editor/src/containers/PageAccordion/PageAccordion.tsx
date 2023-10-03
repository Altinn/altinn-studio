import React, { ReactNode } from 'react';
import classes from './PageAccordion.module.css';
import { Accordion } from '@digdir/design-system-react';
import { NavigationMenu } from './NavigationMenu';

// TODO @David - Dokumentasjon
export type PageAccordionProps = {
  pageName: string;
  children: ReactNode;
  isOpen: boolean;
  onClick: () => void;
};

// TODO @David - Kunne vi kanskje wrappet dette i en Drag and Drop slik at Accordionsene kan flyttes opp og ned?
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
