import { createMuiTheme, FormControl, TextField } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnInputCompontentProvidedProps {
  classes: any;
  id: string;
  placeholder?: any;
  onChangeFunction: any;
  fullWidth?: boolean;
  width?: number;
  disabled?: boolean;
}

export interface IAltinnInputComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = {
  searchBox: {
    background: 'none',
    height: 36,
  },
  searchBoxEnabled: {
    border: '1px solid ' + theme.altinnPalette.primary.blueDark,
  },
  searchBoxDisabled: {
    border: '1px solid ' + theme.altinnPalette.primary.grey,
  },
  altinnInput: {
    fontSize: '16px',
    color: theme.altinnPalette.primary.black,
    padding: '6px',
  },
  altinnInputIcon: {
    color: theme.altinnPalette.primary.black,
    fontSize: '30px',
    marginRight: '10px',
  },
};

// tslint:disable-next-line:max-line-length
class AltinnInput extends React.Component<IAltinnInputCompontentProvidedProps, IAltinnInputComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <FormControl
        classes={{
          root: classNames(classes.searchBox, {
            [classes.searchBoxEnabled]: !this.props.disabled,
            [classes.searchBoxDisabled]: this.props.disabled,
          }),
        }}
        fullWidth={true}
        style={{
          width: this.props.width ? this.props.width : null,
        }}
      >
        <TextField
          disabled={this.props.disabled}
          id={this.props.id}
          placeholder={this.props.placeholder}
          onChange={this.props.onChangeFunction}
          InputProps={{
            disableUnderline: true,
            classes: { root: classNames(classes.altinnInput) },
          }}
        />
      </FormControl>
    );
  }
}

export default withStyles(styles)(AltinnInput);
