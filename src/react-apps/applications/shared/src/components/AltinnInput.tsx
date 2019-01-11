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
    border: '1px solid ' + theme.altinnPalette.primary.blueDark,
    background: 'none',
    height: 32,
  },
  altinnInput: {
    fontSize: '16px',
    color: '#000000',
    padding: '6px',
  },
  altinnInputIcon: {
    color: '#000000',
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
        classes={{ root: classNames(classes.searchBox) }}
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
