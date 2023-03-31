import React from 'react';

import classes from 'src/components/form/FullWidthWrapper.module.css';

export interface IFulLWidthGroupWrapperProps {
  children?: React.ReactNode;
}

export const FullWidthGroupWrapper = ({ children }: IFulLWidthGroupWrapperProps) => (
  <div className={classes.fullWidth}>{children}</div>
);
