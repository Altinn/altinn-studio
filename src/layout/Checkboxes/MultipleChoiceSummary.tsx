import React from 'react';

import { Grid, List, ListItem, ListItemText, makeStyles } from '@material-ui/core';

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
});

export function MultipleChoiceSummary({ formData }: IMultipleChoiceSummaryProps) {
  const classes = useStyles();

  return (
    <Grid
      item
      xs={12}
      data-testid={'multiple-choice-summary'}
    >
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
    </Grid>
  );
}
