import React from 'react';
import classes from './StudioIconTextfield.module.css';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';

export type StudioIconTextfieldProps = {
  icon: React.ReactNode;
} & StudioTextfieldProps;

export const StudioIconTextfield = ({ icon, ...rest }: StudioIconTextfieldProps) => {
  return (
    <div className={classes.iconTextfieldWrapper}>
      <div aria-hidden className={classes.iconContainer}>
        {icon}
      </div>
      <StudioTextfield {...rest} />
    </div>
  );
};
