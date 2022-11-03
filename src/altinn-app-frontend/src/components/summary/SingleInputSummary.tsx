import * as React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';

import { useDisplayData } from 'src/components/hooks';
import SummaryBoilerplate from 'src/components/summary/SummaryBoilerplate';
import type { SummaryDisplayProperties } from 'src/features/form/layout';

export interface ISingleInputSummary {
  formData: any;
  label: any;
  hasValidationMessages: boolean;
  changeText: any;
  onChangeClick: () => void;
  readOnlyComponent?: boolean;
  display?: SummaryDisplayProperties;
}

const useStyles = makeStyles({
  data: {
    fontWeight: 500,
    fontSize: '1.8rem',
    '& p': {
      fontWeight: 500,
      fontSize: '1.8rem',
    },
  },
});

function SingleInputSummary({ formData, display, ...rest }: ISingleInputSummary) {
  const classes = useStyles();
  const displayData = useDisplayData({ formData });

  return (
    <>
      <SummaryBoilerplate
        display={display}
        {...rest}
      />
      <Grid
        item
        xs={12}
        data-testid={'single-input-summary'}
      >
        <Typography
          className={classes.data}
          variant='body1'
        >
          {displayData}
        </Typography>
      </Grid>
    </>
  );
}

export default SingleInputSummary;
