import { createMuiTheme, Snackbar, SnackbarContent } from '@material-ui/core';
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
  postition: any;
}

export interface IAltinnSnackbarComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = {
  snackbar_info: {
    color: altinnTheme.altinnPalette.primary.black,
  },
  snackbar_error: {
    color: altinnTheme.altinnPalette.primary.black,
    background: altinnTheme.altinnPalette.primary.redLight,
    borderRadius: 0,
    boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
    fontSize: 16,
  },
};

class AltinnSnackbar extends React.Component<IAltinnSnackbarComponentProvidedProps, IAltinnSnackbarComponentState> {
  public render() {
    const { classes } = this.props;
    const style = {
      top: this.props.postition.top,
      left: this.props.postition.left,
    }
    return (
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transitionDuration={{
          enter: 0,
        }}
        style={style}
        open={this.props.isOpen}
        onClose={this.props.handleClose}

      >
        <SnackbarContent
          message={this.props.message}
          className={classNames(classes.snackbar_error)}
        />
      </Snackbar>
    );
  }
}

export default withStyles(styles)(AltinnSnackbar);
