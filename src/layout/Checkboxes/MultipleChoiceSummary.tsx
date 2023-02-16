import React from 'react';

import { Grid, List, ListItem, ListItemText, makeStyles } from '@material-ui/core';

import { SummaryBoilerplate } from 'src/components/summary/SummaryBoilerplate';
import type { SummaryDisplayProperties } from 'src/layout/Summary/types';

export interface IMultipleChoiceSummaryProps {
  formData: any;
  label: any;
  hasValidationMessages: boolean;
  changeText: any;
  onChangeClick: () => void;
  readOnlyComponent?: boolean;
  display?: SummaryDisplayProperties;
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

export function MultipleChoiceSummary({
  formData,
  label,
  hasValidationMessages,
  changeText,
  onChangeClick,
  readOnlyComponent,
  display,
}: IMultipleChoiceSummaryProps) {
  const classes = useStyles();

  return (
    <>
      <SummaryBoilerplate
        changeText={changeText}
        onChangeClick={onChangeClick}
        label={label}
        hasValidationMessages={hasValidationMessages}
        readOnlyComponent={readOnlyComponent}
        display={display}
      />
      <Grid
        item
        xs={12}
        data-testid={'multiple-choice-summary'}
      >
        <List classes={{ root: classes.list }}>
          {formData &&
            Object.keys(formData).map((key) => (
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
    </>
  );
}
