import React from 'react';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';

import classes from './StudioIconTextfield.module.css';

export type StudioIconTextfieldProps = {
  icon: React.ReactNode;
} & StudioTextfieldProps;

export const StudioIconTextfield = ({
  icon,
  className,
  ...rest
}: StudioIconTextfieldProps): React.ReactElement => {
  return (
    <div className={classes.container}>
      <div aria-hidden className={classes.prefixIcon}>
        {icon}
      </div>
      <StudioTextfield {...rest} className={`${className} ${classes.textfield}`} />
    </div>
  );
};
