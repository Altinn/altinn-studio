import { Grid } from '@mui/material';
import * as React from 'react';
import { Resources } from './Resources';

export function Footer() {
  return (
    <Grid style={{
      backgroundColor: '#F5F5F5',
      marginTop: 48,
    }}
      container
      justifyContent='center'
    >
      <Grid item xs={10}>
        <Resources />
      </Grid>
    </Grid>
  );
}
