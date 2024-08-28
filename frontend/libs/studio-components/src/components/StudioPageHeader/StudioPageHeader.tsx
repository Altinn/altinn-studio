import React, { type ReactNode } from 'react';
import classes from './StudioPageHeader.module.css';
import { type StudioPageHeaderVariant } from './types/StudioPageHeaderVariant';
import { StudioPageHeaderContextProvider } from './context';

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
