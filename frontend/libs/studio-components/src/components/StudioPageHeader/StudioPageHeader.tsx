import React, { type ReactNode } from 'react';
import classes from './StudioPageHeader.module.css';
import { type StudioPageHeaderVariant } from './types/StudioPageHeaderVariant';
import { StudioPageHeaderContextProvider } from './context';

// TODO - Split to separate files and folders with test
export type StudioPageHeaderProps = {
  children: ReactNode;
  variant?: StudioPageHeaderVariant;
};

export const StudioPageHeader = ({
  children,
  variant = 'regular',
}: StudioPageHeaderProps): React.ReactElement => {
  return (
    <StudioPageHeaderContextProvider variant={variant}>
      <div role='banner' className={classes.studioPageHeader}>
        {children}
      </div>
    </StudioPageHeaderContextProvider>
  );
};
