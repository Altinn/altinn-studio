import React, { forwardRef } from 'react';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';
import cn from 'classnames';

import classes from './StudioIconTextfield.module.css';

export type StudioIconTextfieldProps = {
  icon: React.ReactNode;
} & StudioTextfieldProps;

export const StudioIconTextfield = forwardRef<HTMLDivElement, StudioIconTextfieldProps>(
  (
    { icon, className: givenClassName, ...rest }: StudioIconTextfieldProps,
    ref,
  ): React.ReactElement => {
    const className = cn(givenClassName, classes.textfield);
    return (
      <div className={classes.container} ref={ref}>
        <div aria-hidden className={classes.prefixIcon}>
          {icon}
        </div>
        <StudioTextfield {...rest} className={className} />
      </div>
    );
  },
);

StudioIconTextfield.displayName = 'StudioIconTextfield';
