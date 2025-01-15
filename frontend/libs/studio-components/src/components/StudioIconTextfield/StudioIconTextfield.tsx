import React, { forwardRef } from 'react';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';
import cn from 'classnames';
import classes from './StudioIconTextfield.module.css';

export type StudioIconTextfieldProps = {
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
} & StudioTextfieldProps;

export const StudioIconTextfield = forwardRef<HTMLDivElement, StudioIconTextfieldProps>(
  (
    { Icon, label, className: givenClassName, ...rest }: StudioIconTextfieldProps,
    ref,
  ): React.ReactElement => {
    const className = cn(givenClassName, classes.container);
    return (
      <div className={className} ref={ref}>
        <Icon aria-hidden className={classes.prefixIcon} />
        <StudioTextfield label={label} size='small' {...rest} className={classes.textfield} />
      </div>
    );
  },
);

StudioIconTextfield.displayName = 'StudioIconTextfield';
