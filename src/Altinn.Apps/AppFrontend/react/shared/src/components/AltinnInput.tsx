import {
  createTheme,
  createStyles,
  Grid,
  Input,
  InputLabel,
  WithStyles,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);
const styles = createStyles({
  altinnInputWrapper: {
    height: 'auto',
    width: 'auto',
  },
  altinnInput: {
    backgroundColor: theme.altinnPalette.primary.white,
    border: `2px solid ${theme.altinnPalette.primary.blue}`,
    display: 'flex',
    flexDirection: 'row',
  },
  altinnInputValidationError: {
    backgroundColor: theme.altinnPalette.primary.white,
    border: `2px solid ${theme.altinnPalette.primary.red}`,
    display: 'flex',
    flexDirection: 'row',
  },
  altinnInputField: {
    fontSize: '1.6rem',
    border: 0,
    outline: 'none',
    flexGrow: 2,
    maxWidth: 'match-parent',
  },
  altinnInputIcon: {
    color: theme.altinnPalette.primary.black,
    fontSize: '2.5rem',
    padding: '1.6rem 1rem 1.6rem 1rem',
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  altinnInputLabel: {
    color: theme.altinnPalette.primary.black,
    fontSize: '1.6rem',
    paddingBottom: '1rem',
  },
});

export interface IAltinnInputProps extends
  React.InputHTMLAttributes<any>,
  WithStyles<typeof styles> {
  iconString?: string;
  widthPercentage?: number;
  showLabel?: boolean;
  validationError?: boolean;
  label: string;
}

function AltinnInput(props: IAltinnInputProps) {
  const inputRef = React.createRef<HTMLInputElement>();
  const { classes, iconString, label, widthPercentage, showLabel, validationError, ...rest } = props;

  function focusInput() {
    inputRef.current.focus();
  }

  return (
    <Grid
      container={true}
      direction={'column'}
      onClick={focusInput}
      aria-label={label}
      className={classes.altinnInputWrapper}
      style={{
        width: widthPercentage ? `${widthPercentage}%` : '100%',
      }}
    >
      {showLabel ?
        <InputLabel
          className={classes.altinnInputLabel}
        >
          {label}
        </InputLabel>
        : null
      }
      <Grid
        container={true}
        direction={'row'}
        className={validationError ? classes.altinnInputValidationError : classes.altinnInput}
      >
      {iconString ?
        <i className={`${classes.altinnInputIcon} ${iconString}`} onClick={focusInput}/> :
        null
      }
        <Input
          inputProps={{
            'aria-label': `${label}`,
            'aria-required': 'true',
            ...rest
          }}
          className={classes.altinnInputField}
          disableUnderline={true}
          style={{
            padding: '0rem 0.5rem 0rem 0.5rem',
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

export default withStyles(styles)(AltinnInput);
