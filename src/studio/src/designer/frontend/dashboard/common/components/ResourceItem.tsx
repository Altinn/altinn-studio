import * as React from 'react';
import { Grid } from '@mui/material';

export interface ResourceItemProps {
  link: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export function ResourceItem({
  link,
  label,
  description,
  icon,
}: ResourceItemProps) {
  return (
    <Grid
      container
      direction='row'
      alignItems='flex-start'
      justifyContent='flex-start'
      alignContent='left'
    >
      <Grid xs={2} sm={3} md={3} item>
        {icon}
      </Grid>
      <Grid
        xs={10}
        sm={9}
        md={9}
        item
        container
        direction='column'
        spacing={0}
        alignContent='center'
      >
        <Grid item>
          <a href={link}>
            <p style={{ fontWeight: 500, color: 'black', margin: 0 }}>
              {label}{' '}
            </p>{' '}
          </a>
          <p style={{ marginTop: 0 }}>{description}</p>
        </Grid>
      </Grid>
    </Grid>
  );
}
