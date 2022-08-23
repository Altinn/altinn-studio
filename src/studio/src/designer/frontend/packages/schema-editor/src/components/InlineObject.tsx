import { createStyles, Grid, makeStyles, Paper } from '@material-ui/core';
import React from 'react';
import type { ILanguage, UiSchemaItem } from '../types';
import { getTranslation } from '../utils/language';
import { createJsonSchemaItem } from '../utils/schema';

export interface IInlineObjectProps {
  item: UiSchemaItem;
  language: ILanguage;
}

const useStyles = makeStyles(
  createStyles({
    jsonPaper: {
      whiteSpace: 'pre-wrap',
      backgroundColor: '#EFEFEF',
      padding: '10px',
    },
    informationPaper: {
      backgroundColor: '#E3F7FF',
      padding: '24px',
    },
  }),
);

export function InlineObject({ item, language }: IInlineObjectProps) {
  // present as plain json object, not with any meta fields used in UiSchemaItem
  const jsonObject = createJsonSchemaItem(item);
  const classes = useStyles();
  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Paper
          id='json-paper'
          classes={{ root: classes.jsonPaper }}
          square
          variant='outlined'
        >
          {JSON.stringify(jsonObject, null, '    ')}
        </Paper>
      </Grid>
      <Grid item xs={12}>
        <Paper
          id='information-paper'
          classes={{ root: classes.informationPaper }}
          square
          variant='outlined'
        >
          {getTranslation('combination_inline_object_disclaimer', language)}
        </Paper>
      </Grid>
    </Grid>
  );
}
