import React from 'react';

import { Grid, List, ListItem, ListItemText, makeStyles, Typography } from '@material-ui/core';

import { useDisplayDataProps } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import type { DisplayDataProps } from 'src/features/displayData';

export interface IMultipleChoiceSummaryProps {
  getFormData: (displayDataProps: DisplayDataProps) => { [key: string]: string };
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

export function MultipleChoiceSummary({ getFormData }: IMultipleChoiceSummaryProps) {
  const classes = useStyles();
  const props = useDisplayDataProps();
  const formData = getFormData(props);

  return (
    <Grid
      item
      xs={12}
      data-testid='multiple-choice-summary'
    >
      {Object.keys(formData).length === 0 ? (
        <Typography
          variant='body1'
          className={classes.emptyField}
        >
          <Lang id='general.empty_summary' />
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
