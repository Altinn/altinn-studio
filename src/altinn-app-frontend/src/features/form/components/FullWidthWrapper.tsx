import React from 'react';

import { makeStyles } from '@material-ui/core';
import cn from 'classnames';

export interface IFullWidthWrapperProps {
  children?: React.ReactNode;
  isOnBottom?: boolean;
}

const useStyles = makeStyles({
  fullWidthWrapper: {
    marginLeft: '-24px',
    marginRight: '-24px',
    '@media (min-width: 768px)': {
      marginLeft: '-84px',
      marginRight: '-84px',
    },
    '@media (min-width: 993px)': {
      marginLeft: '-96px',
      marginRight: '-96px',
    },
  },
  consumeBottomPadding: {
    marginBottom: '-24px',
    '@media (min-width: 768px)': {
      marginBottom: '-36px',
    },
  },
});

export function FullWidthWrapper({
  children,
  isOnBottom = false,
}: IFullWidthWrapperProps) {
  const classes = useStyles();

  return (
    <div
      className={cn(classes.fullWidthWrapper, {
        [classes.consumeBottomPadding]: isOnBottom,
      })}
      data-testid='fullWidthWrapper'
    >
      {children}
    </div>
  );
}
