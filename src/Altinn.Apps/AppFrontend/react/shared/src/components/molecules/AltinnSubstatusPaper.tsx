import * as React from 'react';
import { Grid, Typography } from '@material-ui/core';
import AltinnInformationPaper from '../AltinnInformationPaper';

export interface IInformationPaperProps {
  label: string;
  description: string;
}

export default function AltinnSubstatusPaper({
  label,
  description,
}: IInformationPaperProps) {
  return (
    <AltinnInformationPaper>
      <Grid
        container={true}
        direction='column'
      >
        <Grid item={true}>
          <Typography id='substatus-label' style={{ fontSize: '2.4rem', marginBottom: description ? '0.8rem' : '' }} >
            {label}
          </Typography>
        </Grid>
        <Grid item={true}>
          <Typography id='substatus-description' style={{ fontSize: '1.8rem' }}>
            {description}
          </Typography>
        </Grid>
      </Grid>
    </AltinnInformationPaper>
  );
}
