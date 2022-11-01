import React from 'react';
import {
  createTheme,
  FormControl,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnDropdownComponentProvidedProps {
  id: string;
  handleChange: any;
  dropdownItems: string[] | DropdownOption[];
  selectedValue: string;
  inputHeader?: string;
  inputDescription?: string;
  disabled: boolean;
  fullWidth?: boolean;
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
    border: `1px solid ${theme.altinnPalette.primary.blueDark}`,
    background: 'none',
    width: '386px',
  },
  inputField_disabled: {
    background: theme.altinnPalette.primary.greyLight,
    border: `1px solid ${theme.altinnPalette.primary.grey}`,
  },
  inputFieldText: {
    fontSize: '16px',
    color: `${theme.altinnPalette.primary.black} !Important`,
    padding: '6px',
    underline: {
      '&&&:before': {
        borderBottom: 'none',
      },
      '&&:after': {
        borderBottom: 'none',
      },
    },
  },
  fullWidth: {
    width: '100% !important',
  },
});

type DropdownOption = {
  value: string;
  label: string;
};

const getDisplayValue = (selectedValue: string, options: (string | DropdownOption)[]) => {
  const result = options.find((i: string | DropdownOption) => {
    if (typeof i === 'object') {
      return i.value === selectedValue;
    }
    return i === selectedValue;
  });

  if (typeof result === 'object') {
    return result.label;
  }

  return result;
}

export const AltinnDropdown = ({
  inputHeader,
  inputDescription,
  disabled,
  id,
  selectedValue,
  handleChange,
  dropdownItems,
  fullWidth = false,
}: IAltinnDropdownComponentProvidedProps) => {
  const classes = useStyles();

  const formControlClasses = React.useMemo(() => {
    return {
      root: classNames(classes.inputField, {
        [classes.inputField_disabled]: disabled,
        [classes.marginTop_10]: inputDescription || inputHeader,
        [classes.fullWidth]: fullWidth,
      }),
    };
  }, [classes, disabled, inputDescription, inputHeader, fullWidth]);

  const inputPropsClasses = React.useMemo(() => {
    return {
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
          value={disabled ? getDisplayValue(selectedValue, dropdownItems) : selectedValue}
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
