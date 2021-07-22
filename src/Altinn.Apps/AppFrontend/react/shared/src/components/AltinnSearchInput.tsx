import { createTheme, FormControl, InputAdornment, TextField } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnSearchInputComponentProvidedProps {
  classes: any;
  id: string;
  placeholder: any;
  onChangeFunction: any;
  ariaLabel: string;
}

export interface IAltinnSearchInputComponentState {
}

const theme = createTheme(altinnTheme);

const styles = {
  searchBox: {
    border: '1px solid ' + theme.altinnPalette.primary.blueDark,
    marginTop: '10px',
    marginBottom: '24px',
    background: 'none',
    width: '386px',
  },
  searchBoxInput: {
    fontSize: '16px',
    color: '#000000',
    padding: '6px',
  },
  searchBoxIcon: {
    color: '#000000',
    fontSize: '30px',
    marginRight: '10px',
  },
};

// tslint:disable-next-line:max-line-length
export class AltinnSearchInput extends React.Component<IAltinnSearchInputComponentProvidedProps, IAltinnSearchInputComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <FormControl
        classes={{ root: classNames(classes.searchBox) }}
        fullWidth={true}
      >
        <TextField
          id={this.props.id}
          placeholder={this.props.placeholder}
          onChange={this.props.onChangeFunction}
          inputProps={{
            "aria-label": this.props.ariaLabel,
          }}
          InputProps={{
            disableUnderline: true,
            startAdornment:
              <InputAdornment
                position={'end'}
                classes={{ root: classNames(classes.searchBoxIcon) }}
              >
                <i
                  className={'fa fa-search'}
                  title={'Søkeikon'}
                  aria-label={'Søkeikon'}
                />
              </InputAdornment>,
            classes: { root: classNames(classes.searchBoxInput) },
          }}
        />
      </FormControl>
    );
  }
}

export default withStyles(styles)(AltinnSearchInput);
