import React, { forwardRef } from 'react';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';
import cn from 'classnames';
import classes from './StudioIconTextfield.module.css';
import type { Override } from '../../types/Override';

export type StudioIconTextfieldProps = Override<
  {
    icon?: React.ReactNode;
    label: string;
  },
  StudioTextfieldProps
>;

export const StudioIconTextfield = forwardRef<HTMLDivElement, StudioIconTextfieldProps>(
  (
    { icon, label, className: givenClassName, ...rest }: StudioIconTextfieldProps,
    ref,
  ): React.ReactElement => {
    const className = cn(givenClassName, classes.container);
    return (
      <div className={className} ref={ref}>
        <div aria-hidden className={classes.prefixIcon}>
          {icon}
        </div>
        <StudioTextfield className={classes.textfield} label={label} size='small' {...rest} />
      </div>
    );
  },
);

StudioIconTextfield.displayName = 'StudioIconTextfield';
