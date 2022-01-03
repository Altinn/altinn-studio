import {
  Grid,
  List,
  ListItem,
  ListItemText,
  makeStyles,
  Typography,
} from '@material-ui/core';
import * as React from 'react';
import appTheme from 'altinn-shared/theme/altinnAppTheme';
import { EditButton } from './EditButton';

export interface IMultipleChoiceSummaryProps {
  formData: any;
  label: any;
  hasValidationMessages: boolean;
  changeText: any;
  onChangeClick: () => void;
  readOnlyComponent?: boolean;
}

const useStyles = makeStyles({
  label: {
    fontWeight: 500,
    fontSize: '1.8rem',
    '& p': {
      fontWeight: 500,
      fontSize: '1.8rem',
    },
  },
  labelWithError: {
    color: appTheme.altinnPalette.primary.red,
    '& p': {
      color: appTheme.altinnPalette.primary.red,
    },
  },
  row: {
    borderBottom: '1px dashed #008FD6',
    marginBottom: 10,
    paddingBottom: 10,
  },
  list: {
    paddingLeft: 0,
    paddingRight: 0,
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

  const RenderListItem = (value: string, displayText: string) => {
    return (
      <ListItem classes={{ root: classes.list }}>
        <ListItemText id={value} primary={displayText} />
      </ListItem>
    );
  };

  const validationErrorClass = hasValidationMessages
    ? ` ${classes.labelWithError}`
    : '';

  return (
    <>
      <Grid item={true} xs={10}>
        <Typography
          variant='body1'
          className={`${classes.label}${validationErrorClass}`}
          component='span'
        >
          {label}
        </Typography>
      </Grid>
      <Grid item xs={2}>
        {!readOnlyComponent && (
          <EditButton onClick={onChangeClick} editText={changeText} />
        )}
      </Grid>
      <Grid item xs={12}>
        <List>
          {formData &&
            Object.keys(formData).map((key) => {
              return RenderListItem(key, formData[key]);
            })}
        </List>
      </Grid>
    </>
  );
}
