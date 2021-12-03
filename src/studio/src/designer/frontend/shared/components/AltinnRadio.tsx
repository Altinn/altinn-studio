import { FormControlLabel, Radio, makeStyles } from '@material-ui/core';
import { createTheme } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

type AltinnRadioProps = {
  id?: any;
  value?: any;
  checked?: boolean;
  onChange?: any;
  label?: string;
  disabled?: boolean;
};

const theme = createTheme(altinnTheme);

const useStyles = makeStyles({
  altinnFormControlLabel: {
    fontSize: '1.6rem',
    marginRight: '0rem',
  },
  altinnFormControl: {
    marginRight: '6rem',
  },
  altinnRadio: {
    color: `${theme.altinnPalette.primary.blueDark} !important`,
    paddingTop: '0rem',
    paddingBottom: '0rem',
  },
});

export const AltinnRadio = ({
  label,
  id,
  checked,
  onChange,
  disabled,
  value,
}: AltinnRadioProps) => {
  const classes = useStyles();

  if (!label) {
    return (
      <Radio
        classes={{ root: classes.altinnRadio }}
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        value={value}
      />
    );
  }

  return (
    <FormControlLabel
      classes={{
        root: classes.altinnFormControl,
        label: classes.altinnFormControlLabel,
      }}
      label={label}
      control={
        <Radio
          classes={{ root: classes.altinnRadio }}
          id={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          value={value}
        />
      }
    />
  );
};

export default AltinnRadio;
