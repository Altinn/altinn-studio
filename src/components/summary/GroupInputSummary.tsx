import * as React from 'react';

import { makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { useDisplayData } from 'src/components/hooks';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import { getLanguageFromKey } from 'src/utils/sharedUtils';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ITextResource } from 'src/types';

export interface ISingleInputSummary {
  componentId: string;
  formData: any;
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
    fontSize: '0.875rem',
  },
});

export function GroupInputSummary({ componentId, formData, textResources }: ISingleInputSummary) {
  const displayData = useDisplayData({ formData });
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);

  const node = useResolvedNode(componentId);
  const textBindings = node?.item.textResourceBindings;

  return (
    <Typography variant='body1'>
      <span>
        {textBindings && getTextFromAppOrDefault(textBindings.title, textResources, {}, [], false)}
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
