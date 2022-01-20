import { FormControlLabel, Radio } from '@material-ui/core';
import { createTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnRadioComponentProvidedProps extends WithStyles<typeof styles> {
  id?: any;
  value?: any;
  checked?: boolean;
  onChange?: any;
  label?: string;
  disabled?: boolean;
}

const theme = createTheme(altinnTheme);

const styles = () => createStyles({
  altinnFormControlLabel: {
    fontSize: '1.6rem',
    marginRight: '0rem',
  },
  altinnFormControl: {
    marginRight: '6rem',
  },
  altinnRadio: {
    color: theme.altinnPalette.primary.blueDark + '!important',
    paddingTop: '0rem',
    paddingBottom: '0rem',
  },
});

export class AltinnRadio extends
  React.Component<IAltinnRadioComponentProvidedProps> {

  public render() {
    if (!this.props.label) {
      return (
        <Radio
          classes={{ root: this.props.classes.altinnRadio }}
          id={this.props.id}
          checked={this.props.checked}
          onChange={this.props.onChange}
          disabled={this.props.disabled}
          value={this.props.value}
        />
      );
    } else {
      return (
        <FormControlLabel
          classes={{ root: this.props.classes.altinnFormControl, label: this.props.classes.altinnFormControlLabel }}
          label={this.props.label}
          control={
            <Radio
              classes={{ root: this.props.classes.altinnRadio }}
              id={this.props.id}
              checked={this.props.checked}
              onChange={this.props.onChange}
              disabled={this.props.disabled}
              value={this.props.value}
            />
          }
        />
      );
    }
  }
}

export default withStyles(styles)(AltinnRadio);
