import * as React from 'react';

import { Grid, List, ListItem, ListItemText, makeStyles } from '@material-ui/core';

import SummaryBoilerplate from 'src/components/summary/SummaryBoilerplate';

export interface IMultipleChoiceSummaryProps {
  formData: any;
  label: any;
  hasValidationMessages: boolean;
  changeText: any;
  onChangeClick: () => void;
  readOnlyComponent?: boolean;
}

const useStyles = makeStyles({
  row: {
    borderBottom: '1px dashed #008FD6',
    marginBottom: 10,
    paddingBottom: 10,
  },
  list: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  // Match style in \src\components\summary\SingleInputSummary.tsx
  data: {
    fontWeight: 500,
    fontSize: '1.8rem',
    '& p': {
      fontWeight: 500,
      fontSize: '1.8rem',
    },
  },
});

export default function MultipleChoiceSummary({
  formData,
  label,
  hasValidationMessages,
  changeText,
  onChangeClick,
  readOnlyComponent,
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
      />
      <Grid
        item
        xs={12}
        data-testid={'multiple-choice-summary'}
      >
        <List>
          {formData &&
            Object.keys(formData).map((key) => (
              <ListItem
                key={key}
                classes={{ root: classes.list }}
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
