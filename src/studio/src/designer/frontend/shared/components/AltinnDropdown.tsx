import {
  createTheme,
  FormControl,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnDropdownComponentProvidedProps {
  id: string;
  handleChange: any;
  dropdownItems: string[] | DropdownOption[];
  selectedValue: string;
  inputHeader?: string;
  inputDescription?: string;
  disabled: boolean;
}

const theme = createTheme(altinnTheme);

const useStyles = makeStyles({
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

type DropdownOption = {
  value: string;
  label: string;
};

export const AltinnDropdown = ({
  inputHeader,
  inputDescription,
  disabled,
  id,
  selectedValue,
  handleChange,
  dropdownItems,
}: IAltinnDropdownComponentProvidedProps) => {
  const classes = useStyles();

  const formControlClasses = React.useMemo(() => {
    return {
      root: classNames(
        classes.inputField,
        { [classes.inputField_disabled]: disabled },
        {
          [classes.marginTop_10]: inputDescription || inputHeader,
        },
      ),
    };
  }, [classes, disabled, inputDescription, inputHeader]);

  const inputPropsClasses = React.useMemo(() => {
    return {
      disableUnderline: true,
      classes: { root: classNames(classes.inputFieldText) },
    };
  }, [classes]);

  return (
    <React.Fragment>
      {inputHeader && (
        <Typography className={classes.inputHeader} variant='h2'>
          {inputHeader}
        </Typography>
      )}
      {inputDescription && (
        <Typography
          className={classNames(classes.descriptionInput, {
            [classes.marginTop_10]: inputHeader,
          })}
        >
          {inputDescription}
        </Typography>
      )}
      <FormControl classes={formControlClasses} fullWidth={true} id={id}>
        <TextField
          select={!disabled}
          value={selectedValue}
          onChange={handleChange}
          disabled={disabled}
          InputProps={inputPropsClasses}
        >
          {dropdownItems.map((option: string | DropdownOption) => {
            let lbl = '';
            let val = '';

            if (typeof option === 'object') {
              lbl = option.label;
              val = option.value;
            } else {
              lbl = option;
              val = option;
            }

            return (
              <MenuItem key={val} value={val}>
                {lbl}
              </MenuItem>
            );
          })}
        </TextField>
      </FormControl>
    </React.Fragment>
  );
};

export default AltinnDropdown;
