import { createStyles, Grid, makeStyles, Paper } from '@material-ui/core';
import * as React from 'react';
import { ILanguage, UiSchemaItem } from '../types';
import { createJsonSchemaItem, getTranslation } from '../utils';

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

function InlineObject({ item, language }: IInlineObjectProps) {
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

export default InlineObject;
