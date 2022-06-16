import { makeStyles } from '@material-ui/core';
import React from 'react';

export interface IFullWidthWrapperProps {
  children?: React.ReactNode;
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
});

export function FullWidthWrapper({ children }: IFullWidthWrapperProps) {
  const classes = useStyles();

  return (
    <div className={classes.fullWidthWrapper} data-testid='fullWidthWrapper'>
      {children}
    </div>
  );
}
