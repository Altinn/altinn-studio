import type { HTMLProps } from 'react';
import React from 'react';

import { makeStyles } from '@material-ui/core';
import cn from 'classnames';

export interface IFullWidthWrapperProps extends HTMLProps<HTMLDivElement> {
  children?: React.ReactNode;
  isOnBottom?: boolean;
  className?: string;
}

export const xPaddingSmall = 24;
export const xPaddingMedium = 84;
export const xPaddingLarge = 96;
export const yPaddingSmall = 24;
export const yPaddingMedium = 36;

export const fullWidthWrapper = {
  marginLeft: -xPaddingSmall,
  marginRight: -xPaddingSmall,
  width: `calc(100% + ${2 * xPaddingSmall}px)`,
  '@media (min-width: 768px)': {
    marginLeft: -xPaddingMedium,
    marginRight: -xPaddingMedium,
    width: `calc(100% + ${2 * xPaddingMedium}px)`,
  },
  '@media (min-width: 992px)': {
    marginLeft: -xPaddingLarge,
    marginRight: -xPaddingLarge,
    width: `calc(100% + ${2 * xPaddingLarge}px)`,
  },
};

export const consumeBottomPadding = {
  marginBottom: -yPaddingSmall,
  '@media (min-width: 768px)': {
    marginBottom: -yPaddingMedium,
  },
};

const useStyles = makeStyles({
  fullWidthWrapper,
  consumeBottomPadding,
});

export function FullWidthWrapper({
  children,
  isOnBottom = false,
  className,
  ...containerProps
}: IFullWidthWrapperProps) {
  const classes = useStyles();

  return (
    <div
      {...containerProps}
      className={cn(
        classes.fullWidthWrapper,
        {
          [classes.consumeBottomPadding]: isOnBottom,
        },
        className,
      )}
      data-testid='fullWidthWrapper'
    >
      {children}
    </div>
  );
}
