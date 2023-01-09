import * as React from 'react';

import { makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { useDisplayData } from 'src/components/hooks';
import { useExpressions } from 'src/features/expressions/useExpressions';
import { getVariableTextKeysForRepeatingGroupComponent } from 'src/utils/formLayout';
import { getLanguageFromKey } from 'src/utils/sharedUtils';
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
  emptyField: {
    fontStyle: 'italic',
    fontSize: '1.4rem',
  },
});

function GroupInputSummary({ index, formData, textResourceBindings, textResources }: ISingleInputSummary) {
  const displayData = useDisplayData({ formData });
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);

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
      {typeof displayData !== 'undefined' ? (
        <span className={classes.data}>{displayData}</span>
      ) : (
        <span className={classes.emptyField}>{getLanguageFromKey('general.empty_summary', language || {})}</span>
      )}
    </Typography>
  );
}

export default GroupInputSummary;
