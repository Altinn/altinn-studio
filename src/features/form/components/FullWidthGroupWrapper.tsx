import React from 'react';

import { makeStyles } from '@material-ui/core';

export interface IFulLWidthGroupWrapperProps {
  children?: React.ReactNode;
}

const useStyles = makeStyles({
  fullWidthGroupWrapper: {
    marginLeft: '-24px',
    marginRight: '-24px',
    '@media (min-width:993px)': {
      marginLeft: '-36px',
      marginRight: '-36px',
    },
  },
});

export function FullWidthGroupWrapper({ children }: IFulLWidthGroupWrapperProps) {
  const classes = useStyles();

  return (
    <div
      className={classes.fullWidthGroupWrapper}
      data-testid='fullWidthGroupWrapper'
    >
      {children}
    </div>
  );
}
