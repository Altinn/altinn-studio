import { Button, createMuiTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnButtonComponentProvidedProps {
  classes: any;
  btnText: string;
  onClickFunction?: any;
  className?: any;
}

export interface IAltinnButtonComponentState {
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

class AltinnButton extends React.Component<IAltinnButtonComponentProvidedProps, IAltinnButtonComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <Button
        variant='contained'
        color='primary'
        className={classNames(classes.button, this.props.className)}
        onClick={this.props.onClickFunction}
      >
        {this.props.btnText}
      </Button>
    );
  }
}

export default withStyles(styles)(AltinnButton);
