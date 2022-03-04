import * as React from 'react';
import { Grid, makeStyles, Typography } from '@material-ui/core';
import appTheme from 'altinn-shared/theme/altinnAppTheme';
import { EditButton } from './EditButton';

export interface ISingleInputSumary {
  formData: any;
  label: any;
  hasValidationMessages: boolean;
  changeText: any;
  onChangeClick: () => void;
  readOnlyComponent?: boolean;
}

const useStyles = makeStyles({
  label: {
    fontWeight: 500,
    fontSize: '1.8rem',
    '& p': {
      fontWeight: 500,
      fontSize: '1.8rem',
    },
  },
  labelWithError: {
    color: appTheme.altinnPalette.primary.red,
    '& p': {
      color: appTheme.altinnPalette.primary.red,
    },
  },
  row: {
    borderBottom: '1px dashed #008FD6',
    marginBottom: 10,
    paddingBottom: 10,
  },
});

function SingleInputSummary({
  formData,
  label,
  hasValidationMessages,
  changeText,
  onChangeClick,
  readOnlyComponent,
}: ISingleInputSumary) {
  const classes = useStyles();
  const [displayData, setDisplayData] = React.useState<string>('');

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
    <>
      <Grid item={true} xs={10}>
        <Typography
          variant='body1'
          className={`${classes.label}${
            hasValidationMessages ? ` ${classes.labelWithError}` : ''
          }`}
          component='span'
        >
          {label}
        </Typography>
      </Grid>
      <Grid item xs={2}>
        {!readOnlyComponent && (
          <EditButton onClick={onChangeClick} editText={changeText} />
        )}
      </Grid>
      <Grid item xs={12}>
        <Typography variant='body1'>{displayData}</Typography>
      </Grid>
    </>
  );
}

export default SingleInputSummary;
