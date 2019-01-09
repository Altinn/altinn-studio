import { createMuiTheme, Snackbar } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnSnackbarComponentProvidedProps {
  classes: any;
  onClickFunction?: any;
  className?: any;
  isOpen: boolean;
  handleClose?: any;
  message?: string;
}

export interface IAltinnSnackbarComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = {
  button: {
    'color': theme.altinnPalette.primary.white,
    'background': theme.altinnPalette.primary.blueDark,
    'maxWidth': '150px',
    'textTransform': 'none' as 'none',
    'fontWeight': 400,
    'marginTop': '20px',
    'borderRadius': '0',
    '&:hover': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
  },
};

class AltinnSnackbar extends React.Component<IAltinnSnackbarComponentProvidedProps, IAltinnSnackbarComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        open={this.props.isOpen}
        onClose={this.props.handleClose}
        message={this.props.message}
      />
    );
  }
}

export default withStyles(styles)(AltinnSnackbar);
