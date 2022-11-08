import React from 'react';
import cn from 'classnames';
import classes from './AltinnColumnLayout.module.css';

export interface IAltinnColumnLayoutProps {
  className?: string;
  /** Children rendered as main content */
  children: any;
  /** Children rendered in the side menu */
  sideMenuChildren: any;
  /** The header displayed above the main content */
  header: string;
}

export const AltinnColumnLayout = ({
  children,
  className,
  header,
  sideMenuChildren,
}: IAltinnColumnLayoutProps) => {
  return (
    <div
      className={cn(className, classes.root)}
      id={'altinn-column-layout-container'}
    >
      <div className={classes.left}>
        <h1 className={classes.header}>
          {header}
        </h1>
        <div id={'altinn-column-layout-main-content'}>
          {children}
        </div>
      </div>
      <div
        id={'altinn-column-layout-side-menu'}
        className={classes.right}
      >
        {sideMenuChildren}
      </div>
    </div>
  );
}
