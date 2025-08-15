import React, { type ElementType, forwardRef, type ReactElement } from 'react';
import classes from '../common.module.css';
import { StudioButton, type StudioButtonProps } from '../../StudioButton';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import cn from 'classnames';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';
import type { OverridableComponent } from '../../../types/OverridableComponent';
import type { OverridableComponentProps } from '../../../types/OverridableComponentProps';
import type { OverridableComponentRef } from '../../../types/OverridableComponentRef';

export type StudioPageHeaderHeaderButtonProps = {
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
} & Omit<StudioButtonProps, 'data-color' | 'variant'>;

export const StudioPageHeaderHeaderButton: OverridableComponent<
  StudioPageHeaderHeaderButtonProps,
  HTMLButtonElement
> = forwardRef(
  <As extends ElementType = 'button'>(
    {
      color,
      variant,
      className: givenClass,
      ...rest
    }: OverridableComponentProps<StudioPageHeaderHeaderButtonProps, As>,
    ref: OverridableComponentRef<As>,
  ): ReactElement => {
    return (
      <StudioButton
        ref={ref}
        className={cn(classes.linkOrButton, classes[variant], classes[color], givenClass)}
        {...rest}
      />
    );
  },
);

StudioPageHeaderHeaderButton.displayName = 'StudioPageHeader.HeaderButton';
