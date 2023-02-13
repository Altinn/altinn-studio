import * as React from 'react';

import { createStyles, createTheme, Grid, Input, InputLabel, makeStyles } from '@material-ui/core';
import cn from 'classnames';

import altinnTheme from 'src/theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);
const styles = createStyles({
  input: {
    backgroundColor: theme.altinnPalette.primary.white,
    border: `2px solid ${theme.altinnPalette.primary.blue}`,
    display: 'flex',
    flexDirection: 'row',
  },
  inputValidationError: {
    border: `2px solid ${theme.altinnPalette.primary.red}`,
  },
  inputField: {
    fontSize: '1rem',
    border: 0,
    outline: 'none',
    flexGrow: 2,
    maxWidth: 'match-parent',
  },
  inputIcon: {
    color: theme.altinnPalette.primary.black,
    fontSize: '1.5625rem',
    padding: '1rem 0.625rem 1rem 0.625rem',
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  inputLabel: {
    color: theme.altinnPalette.primary.black,
    fontSize: '1rem',
    paddingBottom: '0.625rem',
  },
});

export interface IAltinnInputProps extends React.InputHTMLAttributes<any> {
  iconString?: string;
  widthPercentage?: number;
  showLabel?: boolean;
  validationError?: boolean;
  label: string;
}

const useStyles = makeStyles(styles);

function AltinnInput(props: IAltinnInputProps) {
  const inputRef = React.createRef<HTMLInputElement>();
  const { iconString, label, widthPercentage, showLabel, validationError, ...rest } = props;
  const classes = useStyles();

  function focusInput() {
    inputRef.current?.focus();
  }
  return (
    <Grid
      container={true}
      direction={'column'}
      onClick={focusInput}
      aria-label={label}
      style={{
        width: widthPercentage ? `${widthPercentage}%` : '100%',
      }}
    >
      {showLabel ? <InputLabel className={classes.inputLabel}>{label}</InputLabel> : null}
      <Grid
        {...(validationError && { 'data-testid': 'input-validation-error' })}
        container={true}
        direction={'row'}
        className={cn(classes.input, validationError && classes.inputValidationError)}
      >
        {iconString ? (
          <i
            data-testid='altinninput-iconString'
            className={`${classes.inputIcon} ${iconString}`}
          />
        ) : null}
        <Input
          inputProps={{
            'aria-label': `${label}`,
            'aria-required': 'true',
            ...rest,
          }}
          className={classes.inputField}
          disableUnderline={true}
          style={{
            padding: '0rem 0.3125rem 0rem 0.3125rem',
          }}
          inputRef={inputRef}
          tabIndex={0}
        />
      </Grid>
    </Grid>
  );
}

AltinnInput.defaultProps = {
  showLabel: true,
  validationError: false,
};

export default AltinnInput;
