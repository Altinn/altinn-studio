import React from 'react';
import { FormControl, MenuItem, TextField, Typography } from '@mui/material';
import classNames from 'classnames';
import classes from './AltinnDropdown.module.css';

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

  return result ?? '';
};

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
