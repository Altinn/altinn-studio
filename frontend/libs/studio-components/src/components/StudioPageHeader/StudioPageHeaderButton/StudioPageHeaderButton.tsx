import React, { forwardRef, type ReactElement } from 'react';
import classes from './StudioPageHeaderButton.module.css';
import { StudioButton, type StudioButtonProps } from '../../StudioButton';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import cn from 'classnames';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';

export type StudioPageHeaderButtonProps = {
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
} & Omit<StudioButtonProps, 'color' | 'variant'>;

export const StudioPageHeaderButton = forwardRef<HTMLButtonElement, StudioPageHeaderButtonProps>(
  ({ color, variant, className: givenClass, ...rest }, ref): ReactElement => {
    return (
      <StudioButton
        ref={ref}
        className={cn(classes.button, classes[variant], classes[color], givenClass)}
        {...rest}
      />
    );
  },
);

StudioPageHeaderButton.displayName = 'StudioPageHeaderButton';
