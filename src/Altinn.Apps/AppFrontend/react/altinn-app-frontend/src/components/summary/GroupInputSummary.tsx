import * as React from 'react';
import { Typography } from '@material-ui/core';

export interface ISingleInputSumary {
  formData: any;
  label: any;
}

function GroupInputSummary({ formData, label }: ISingleInputSumary) {
  const [displayData, setDisplayData] = React.useState<string>('');

  React.useEffect(() => {
    if (formData && typeof formData === 'object') {
      let displayString: string = '';
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
      <span style={{ fontWeight: 500 }}>{`${label}: `}</span>
      <span>{displayData}</span>
    </Typography>
  );
}

export default GroupInputSummary;
