import * as React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { useDisplayData } from 'src/components/hooks';
import SummaryBoilerplate from 'src/components/summary/SummaryBoilerplate';
import { getLanguageFromKey } from 'src/utils/sharedUtils';
import type { SummaryDisplayProperties } from 'src/layout/Summary/types';

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
  emptyField: {
    fontStyle: 'italic',
    fontSize: '1.6rem',
  },
});

function SingleInputSummary({ formData, display, ...rest }: ISingleInputSummary) {
  const classes = useStyles();
  const displayData = useDisplayData({ formData });
  const language = useAppSelector((state) => state.language.language);

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
        {typeof displayData !== 'undefined' ? (
          <Typography
            className={classes.data}
            variant='body1'
          >
            {displayData}
          </Typography>
        ) : (
          <Typography
            variant='body1'
            className={classes.emptyField}
          >
            {getLanguageFromKey('general.empty_summary', language || {})}
          </Typography>
        )}
      </Grid>
    </>
  );
}

export default SingleInputSummary;
