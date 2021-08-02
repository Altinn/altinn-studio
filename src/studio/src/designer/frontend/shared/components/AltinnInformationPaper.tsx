import { createTheme, Paper } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnInformationPaperCompontentProvidedProps {
  classes: any;
}

export interface IAltinnInformationPaperComponentState {
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

// eslint-disable-next-line max-len
export class AltinnInformationPaper extends React.Component<IAltinnInformationPaperCompontentProvidedProps, IAltinnInformationPaperComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <Paper elevation={0} className={classes.paper}>
        {this.props.children}
      </Paper>
    );
  }
}

export default withStyles(styles)(AltinnInformationPaper);
