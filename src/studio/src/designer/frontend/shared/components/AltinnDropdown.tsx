import { createTheme, createStyles, FormControl, MenuItem, TextField, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnDropdownComponentProvidedProps {
  id: string;
  classes: any;
  handleChange: any;
  dropdownItems: string[];
  selectedValue: string;
  inputHeader?: string;
  inputDescription?: string;
  disabled: boolean;
}

export interface IAltinnDropdownComponentState {
}

const theme = createTheme(altinnTheme);

const styles = createStyles({
  inputHeader: {
    fontSize: '24px',
    fontWeight: 400,
  },
  marginTop_10: {
    marginTop: '10px',
  },
  descriptionInput: {
    fontSize: '16px',
  },
  inputField: {
    border: '1px solid ' + theme.altinnPalette.primary.blueDark,
    background: 'none',
    width: '386px',
  },
  inputField_disabled: {
    background: theme.altinnPalette.primary.greyLight,
    border: '1px solid ' + theme.altinnPalette.primary.grey,
  },
  inputFieldText: {
    fontSize: '16px',
    color: theme.altinnPalette.primary.black + '!Important',
    padding: '6px',
  },
});

// eslint-disable-next-line max-len
export class AltinnDropdown extends React.Component<IAltinnDropdownComponentProvidedProps, IAltinnDropdownComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <React.Fragment>
        {this.props.inputHeader &&
          <Typography className={classes.inputHeader} variant='h2'>
            {this.props.inputHeader}
          </Typography>
        }
        {this.props.inputDescription &&
          <Typography
            className={classNames(classes.descriptionInput, { [classes.marginTop_10]: this.props.inputHeader })}>
            {this.props.inputDescription}
          </Typography>
        }
        <FormControl
          classes={{
            root: classNames(
              classes.inputField,
              { [classes.inputField_disabled]: this.props.disabled },
              { [classes.marginTop_10]: this.props.inputDescription || this.props.inputHeader })
          }}
          fullWidth={true}
          id={this.props.id}
        >
          <TextField
            select={!this.props.disabled}
            value={this.props.selectedValue}
            onChange={this.props.handleChange}
            disabled={this.props.disabled}
            InputProps={{
              disableUnderline: true,
              classes: { root: classNames(classes.inputFieldText) },
            }}
          >
            {this.props.dropdownItems.map((option: string) => (
              <MenuItem key={option} value={option} className={classes.test}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </FormControl>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(AltinnDropdown);
