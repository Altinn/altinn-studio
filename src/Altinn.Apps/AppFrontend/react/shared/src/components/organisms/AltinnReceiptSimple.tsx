/* eslint-disable import/no-named-as-default */
/* eslint-disable react/prop-types */
import { Typography } from '@material-ui/core';
import { createTheme, createStyles, MuiThemeProvider, WithStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../../theme/altinnAppTheme';

export interface IReceiptComponentProps extends WithStyles<typeof styles> {
  body: string;
  title: string;
}

const theme = createTheme(altinnTheme);

const styles = createStyles({
  paddingTop24: {
    paddingTop: '2.4rem',
  },
  wordBreak: {
    wordBreak: 'break-word',
  },
});

export function ReceiptComponentSimple(props: IReceiptComponentProps) {
  return (
    <div className={props.classes.wordBreak}>
      <MuiThemeProvider theme={theme}>
        <Typography variant='h2'>
          {props.title}
        </Typography>

        <Typography variant='body1' className={props.classes.paddingTop24}>
          {props.body}
        </Typography>
      </MuiThemeProvider>
    </div>
  );
}

export default withStyles(styles)(ReceiptComponentSimple);
