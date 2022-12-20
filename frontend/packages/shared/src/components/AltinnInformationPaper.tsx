import React from 'react';
import { createTheme, Paper } from '@mui/material';
import { withStyles } from '@mui/styles';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnInformationPaperCompontentProvidedProps {
  classes: any;
  children: React.ReactNode;
}

const theme = createTheme(altinnTheme);

const styles = {
  paper: {
    background: theme.altinnPalette.primary.yellowLight,
    boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
    borderRadius: 0,
    fontSize: 16,
    padding: 26,
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  },
};

export const AltinnInformationPaper = ({
  classes,
  children,
}: IAltinnInformationPaperCompontentProvidedProps) => {
  return (
    <Paper elevation={0} className={classes.paper}>
      {children}
    </Paper>
  );
};

export default withStyles(styles)(AltinnInformationPaper);
