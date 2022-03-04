import * as React from 'react';
import { makeStyles, Typography } from '@material-ui/core';

export interface ISingleInputSumary {
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

function GroupInputSummary({ formData, label }: ISingleInputSumary) {
  const [displayData, setDisplayData] = React.useState<string>('');
  const classes = useStyles();

  React.useEffect(() => {
    if (formData && typeof formData === 'object') {
      let displayString = '';
      Object.keys(formData).forEach((key, index) => {
        displayString += `${index > 0 ? ' ' : ''}${formData[key]}`;
      });
      setDisplayData(displayString);
    } else {
      setDisplayData(formData);
    }
  }, [formData]);
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
