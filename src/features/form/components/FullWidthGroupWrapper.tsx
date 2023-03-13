import React from 'react';

import classes from 'src/features/form/components/FullWidthWrapper.module.css';

export interface IFulLWidthGroupWrapperProps {
  children?: React.ReactNode;
}

export const FullWidthGroupWrapper = ({ children }: IFulLWidthGroupWrapperProps) => (
  <div className={classes.fullWidth}>{children}</div>
);
