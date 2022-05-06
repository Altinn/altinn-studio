import * as React from 'react';
import { makeStyles, Typography } from '@material-ui/core';
import { useDisplayData } from 'src/components/hooks';

export interface ISingleInputSummary {
  formData: any;
  label: any;
}

const useStyles = makeStyles({
  label: {
    fontWeight: 500,
    '& p': {
      fontWeight: 500,
    },
  },
});

function GroupInputSummary({ formData, label }: ISingleInputSummary) {
  const displayData = useDisplayData({ formData });
  const classes = useStyles();
  return (
    <Typography variant='body1'>
      <span className={classes.label}>
        {label} {': '}
      </span>
      <span>{displayData}</span>
    </Typography>
  );
}

export default GroupInputSummary;
