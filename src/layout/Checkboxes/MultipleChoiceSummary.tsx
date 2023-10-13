import React from 'react';

import { Grid, List, ListItem, ListItemText, makeStyles, Typography } from '@material-ui/core';

import { useLanguage } from 'src/hooks/useLanguage';

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
    overflowWrap: 'break-word',
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
  const { lang } = useLanguage();

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
          {lang('general.empty_summary')}
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
