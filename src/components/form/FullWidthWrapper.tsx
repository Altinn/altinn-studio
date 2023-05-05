import React from 'react';
import type { HTMLProps } from 'react';

import cn from 'classnames';

import classes from 'src/components/form/FullWidthWrapper.module.css';

export interface IFullWidthWrapperProps extends HTMLProps<HTMLDivElement> {
  children?: React.ReactNode;
  isOnBottom?: boolean;
  isOnTop?: boolean;
  className?: string;
}

export const FullWidthWrapper = ({
  children,
  isOnBottom = false,
  isOnTop = false,
  className,
  ...containerProps
}: IFullWidthWrapperProps) => (
  <div
    {...containerProps}
    className={cn(
      classes.fullWidth,
      { [classes.consumeBottomPadding]: isOnBottom, [classes.consumeTopPadding]: isOnTop },
      className,
    )}
    data-testid='fullWidthWrapper'
  >
    {children}
  </div>
);
