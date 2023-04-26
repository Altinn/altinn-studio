import React from 'react';

import { Grid, List, ListItem, ListItemText, makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';

export interface IMultipleChoiceSummaryProps {
  formData: { [key: string]: string };
}

const useStyles = makeStyles({
  list: {
    padding: 0,
  },
  listItem: {
    padding: 0,
  },
  // Match style in \src\components\summary\SingleInputSummary.tsx
  data: {
    fontWeight: 500,
    fontSize: '1.125rem',
    '& p': {
      fontWeight: 500,
      fontSize: '1.125rem',
    },
  },
  emptyField: {
    fontStyle: 'italic',
    fontSize: '1rem',
    lineHeight: 1.6875,
  },
});

export function MultipleChoiceSummary({ formData }: IMultipleChoiceSummaryProps) {
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);

  return (
    <Grid
      item
      xs={12}
      data-testid={'multiple-choice-summary'}
    >
      {Object.keys(formData).length === 0 ? (
        <Typography
          variant='body1'
          className={classes.emptyField}
        >
          {getLanguageFromKey('general.empty_summary', language || {})}
        </Typography>
      ) : (
        <List classes={{ root: classes.list }}>
          {Object.keys(formData).map((key) => (
            <ListItem
              key={key}
              classes={{ root: classes.listItem }}
            >
              <ListItemText
                id={key}
                primaryTypographyProps={{ classes: { root: classes.data } }}
                primary={formData[key]}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Grid>
  );
}
