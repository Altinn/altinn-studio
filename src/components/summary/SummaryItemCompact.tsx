import React from 'react';

import { makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { LayoutNode } from 'src/utils/layout/hierarchy';

export interface ICompactSummaryItem {
  targetNode: LayoutNode;
  displayData: string;
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

export function SummaryItemCompact({ targetNode, displayData }: ICompactSummaryItem) {
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const textBindings = targetNode.item.textResourceBindings;

  return (
    <Typography
      variant='body1'
      data-testid={'summary-item-compact'}
    >
      <span>
        {textBindings && getTextFromAppOrDefault(textBindings.title, textResources, {}, [], false)}
        {' : '}
      </span>
      {displayData ? (
        <span className={classes.data}>{displayData}</span>
      ) : (
        <span className={classes.emptyField}>{getLanguageFromKey('general.empty_summary', language || {})}</span>
      )}
    </Typography>
  );
}
