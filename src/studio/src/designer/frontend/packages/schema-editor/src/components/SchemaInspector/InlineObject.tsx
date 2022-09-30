import { Grid, Paper } from '@material-ui/core';
import React from 'react';
import type { ILanguage } from '../../types';
import { getTranslation } from '../../utils/language';
import type { UiSchemaNode } from '@altinn/schema-model';
import classes from './InlineObject.module.css';

export interface IInlineObjectProps {
  item: UiSchemaNode;
  language: ILanguage;
}

export function InlineObject({ item, language }: IInlineObjectProps) {
  // present as plain json object, not with any meta fields used in UiSchemaItem
  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Paper id='json-paper' classes={{ root: classes.jsonPaper }} square variant='outlined'>
          {JSON.stringify(item, null, '    ')}
        </Paper>
      </Grid>
      <Grid item xs={12}>
        <Paper id='information-paper' classes={{ root: classes.informationPaper }} square variant='outlined'>
          {getTranslation('combination_inline_object_disclaimer', language)}
        </Paper>
      </Grid>
    </Grid>
  );
}
