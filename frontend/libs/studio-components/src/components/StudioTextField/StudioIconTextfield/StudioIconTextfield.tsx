import React from 'react';
import { type TextfieldProps, Textfield } from '@digdir/design-system-react';
import classes from './StudioIconTextfield.module.css';

export type StudioIconTextfieldProps = {
  icon: React.ReactNode;
} & TextfieldProps;

export const StudioIconTextfield = ({ icon, error, ...rest }: StudioIconTextfieldProps) => {
  return (
    <div className={classes.iconTextfieldWrapper}>
      <div aria-hidden className={classes.iconContainer}>
        {icon}
      </div>
      <Textfield {...rest} error={error} />
    </div>
  );
};
