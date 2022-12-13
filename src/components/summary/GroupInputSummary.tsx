import * as React from 'react';

import { makeStyles, Typography } from '@material-ui/core';

import { useDisplayData } from 'src/components/hooks';
import { useExpressions } from 'src/features/expressions/useExpressions';
import { getVariableTextKeysForRepeatingGroupComponent } from 'src/utils/formLayout';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ITextResource, ITextResourceBindings } from 'src/types';

export interface ISingleInputSummary {
  index: number;
  formData: any;
  textResourceBindings: ITextResourceBindings | undefined;
  textResources: ITextResource[];
}

const useStyles = makeStyles({
  data: {
    fontWeight: 500,
    '& p': {
      fontWeight: 500,
    },
  },
});

function GroupInputSummary({ index, formData, textResourceBindings, textResources }: ISingleInputSummary) {
  const displayData = useDisplayData({ formData });
  const classes = useStyles();

  const textResourceBindingsResolvedExpressions = useExpressions(textResourceBindings);

  const textResourceBindingsResolvedTextKeys = getVariableTextKeysForRepeatingGroupComponent(
    textResources,
    textResourceBindingsResolvedExpressions,
    index,
  );

  return (
    <Typography variant='body1'>
      <span>
        {textResourceBindingsResolvedTextKeys &&
          getTextFromAppOrDefault(textResourceBindingsResolvedTextKeys.title, textResources, {}, [], false)}
        {' : '}
      </span>
      <span className={classes.data}>{displayData}</span>
    </Typography>
  );
}

export default GroupInputSummary;
