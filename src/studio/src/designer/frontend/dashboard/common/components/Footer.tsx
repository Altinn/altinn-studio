import * as React from 'react';
import { Grid } from '@mui/material';
import { makeStyles } from '@material-ui/core';
import { Resources } from './Resources';

const useStyles = makeStyles(() => ({
  rootGrid: {
    backgroundColor: '#F5F5F5',
    marginTop: 48,
  },
}));

export const Footer = () => {
  const classes = useStyles();

  return (
    <Grid className={classes.rootGrid} container justifyContent='center'>
      <Grid item xs={10}>
        <Resources />
      </Grid>
    </Grid>
  );
};
