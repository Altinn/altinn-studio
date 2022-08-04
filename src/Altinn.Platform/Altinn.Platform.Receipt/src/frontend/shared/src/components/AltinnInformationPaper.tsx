/* eslint-disable no-undef */
import { createTheme, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);
const useStyles = makeStyles({
  paper: {
    background: theme.altinnPalette.primary.white,
    boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
    borderRadius: 0,
    fontSize: 16,
    padding: 24,
    fontFamily: 'Altinn-DIN',
  },
});

export interface IAltinnInformationPaperProps {
  children: JSX.Element[] | JSX.Element;
}

export default function AltinnInformationPaper({
  children,
} : IAltinnInformationPaperProps) {
  const classes = useStyles();
  return (
    <Paper
      elevation={0}
      className={classes.paper}
    >
      {children}
    </Paper>
  );
}
