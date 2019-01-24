import { Button, createMuiTheme } from '@material-ui/core';
import { createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnButtonComponentProvidedProps extends WithStyles<typeof styles> {
  id?: any;
  classes: any;
  btnText: string;
  onClickFunction?: any;
  className?: any;
  secondaryButton?: boolean;
  disabled?: boolean;
}

export interface IAltinnButtonComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  borderBottom: {
    borderBottom: '1px solid' + altinnTheme.altinnPalette.primary.blueDark,
  },
  borderBottomDisabled: {
    borderBottom: '1px solid' + altinnTheme.altinnPalette.primary.greyMedium,
  },
  button: {
    'color': theme.altinnPalette.primary.white,
    'background': theme.altinnPalette.primary.blueDark,
    'textTransform': 'none' as 'none',
    'fontWeight': 400,
    'height': 36,
    'borderRadius': '0',
    'padding': '8px 24px 8px 24px',
    '&:hover': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
  },
  secondaryButton: {
    'fontSize': '14px',
    'color': theme.altinnPalette.primary.blueDarker,
    'background': 'transparent',
    'height': 36,
    'textTransform': 'none',
    'fontWeight': 400,
    'borderRadius': '0',
    '&:hover': {
      background: theme.altinnPalette.primary.greyLight,
      color: theme.altinnPalette.primary.blueDarker,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.greyLight,
      color: theme.altinnPalette.primary.black,
    },
  },
});

class AltinnButton extends
  React.Component<IAltinnButtonComponentProvidedProps, IAltinnButtonComponentState> {

  public render() {
    const { classes } = this.props;
    return (
      <Button
        id={this.props.id}
        disabled={this.props.disabled}
        variant={this.props.secondaryButton === true ? 'text' : 'contained'}
        color='primary'
        className={classNames(this.props.className, {
          [classes.button]: this.props.secondaryButton !== true,
          [classes.secondaryButton]: this.props.secondaryButton === true,
        })}
        onClick={this.props.onClickFunction}
        style={{ fontSize: 16 }}
      >
        <span
          className={classNames({
            [classes.borderBottom]: this.props.secondaryButton === true && this.props.disabled !== true,
            [classes.borderBottomDisabled]: this.props.secondaryButton === true && this.props.disabled === true,
          })}
        >
          {this.props.btnText}
        </span>
      </Button>
    );
  }
}

export default withStyles(styles)(AltinnButton);
