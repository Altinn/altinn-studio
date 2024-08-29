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
  ({ color, variant, ...rest }, ref): ReactElement => {
    const getClassName = (): string => {
      if (variant === 'regular' && color === 'dark') return classes.regularDark;
      if (variant === 'regular' && color === 'light') return classes.regularLight;
      if (variant === 'preview' && color === 'dark') return classes.previewDark;
      if (variant === 'preview' && color === 'light') return classes.previewLight;
    };

    return <StudioButton ref={ref} className={cn(classes.button, getClassName())} {...rest} />;
  },
);

StudioPageHeaderButton.displayName = 'StudioPageHeaderButton';
