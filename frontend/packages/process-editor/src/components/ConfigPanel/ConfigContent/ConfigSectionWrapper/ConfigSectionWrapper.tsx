import type { ReactNode } from 'react';
import React from 'react';
import classes from './ConfigSectionWrapper.module.css';
import { Divider } from '@digdir/design-system-react';

export type ConfigSectionWrapperProps = {
  children: ReactNode;
};

export const ConfigSectionWrapper = ({ children }: ConfigSectionWrapperProps): JSX.Element => {
  return (
    <>
      <div className={classes.configSectionWrapper}>{children}</div>
      <Divider />
    </>
  );
};
