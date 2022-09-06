import React, { ReactNode } from 'react';
import { makeStyles } from '@material-ui/core';

export const useStyles = makeStyles({
  label: {
    padding: 0,
    fontWeight: 400,
    fontSize: 16,
    marginTop: 24,
    marginBottom: 6,
    '& .Mui-focusVisible': {
      background: 'gray',
    },
  },
});

interface InspectorHeaderProps {
  children: ReactNode;
}

export const Label = ({ children }: InspectorHeaderProps) => {
  const classes = useStyles();
  return (
    <p className={classes.label} aria-roledescription='label'>
      {children}
    </p>
  );
};
