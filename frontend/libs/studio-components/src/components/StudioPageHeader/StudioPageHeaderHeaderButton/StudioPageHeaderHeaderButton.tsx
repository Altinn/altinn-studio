import React, { forwardRef, type ReactElement } from 'react';
import classes from '../common.module.css';
import { StudioButton, type StudioButtonProps } from '../../StudioButton';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import cn from 'classnames';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';

export type StudioPageHeaderHeaderButtonProps = {
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
} & Omit<StudioButtonProps, 'color' | 'variant'>;

export const StudioPageHeaderHeaderButton = forwardRef<
  HTMLButtonElement,
  StudioPageHeaderHeaderButtonProps
>(({ color, variant, className: givenClass, ...rest }, ref): ReactElement => {
  return (
    <StudioButton
      ref={ref}
      className={cn(classes.linkOrButton, classes[variant], classes[color], givenClass)}
      {...rest}
    />
  );
});

StudioPageHeaderHeaderButton.displayName = 'StudioPageHeader.HeaderButton';
