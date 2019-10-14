import {
  createMuiTheme,
  createStyles,
  FormControl,
  Grid,
  Input,
  TextField,
  WithStyles,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

const theme = createMuiTheme(altinnTheme);
const NewInputStyling = createStyles({
  altinnInput: {
    backgroundColor: theme.altinnPalette.primary.white,
    border: `2px solid ${theme.altinnPalette.primary.blue}`,
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
    width: '100%',
    fontSize: '1.2rem',
  },
});

export interface INewAltinnInputComponentProps extends
  React.InputHTMLAttributes<any>,
  WithStyles<typeof NewInputStyling> {
  iconString?: string;
  widthPercentage?: number;
  label: string;
}

function NewInput(props: INewAltinnInputComponentProps) {
  const inputRef = React.createRef<HTMLInputElement>();
  const { classes, iconString, label, widthPercentage, ...rest } = props;

  function focusInput() {
    inputRef.current.focus();
  }

  return (
    <div
      onClick={focusInput}
      aria-label={label}
    >
      <label
        className={classes.altinnInputLabel}
      >
        {label}
      </label>
      <div
        className={classes.altinnInput}
        style={{
          width: !!widthPercentage ? `${widthPercentage}%` : '100%',
        }}
      >
      {!!iconString ?
        <i className={`${classes.altinnInputIcon} ${iconString}`} onClick={focusInput}/> :
        null
      }
        <Input
          inputRef={inputRef}
          className={classes.altinnInputField}
          aria-label={label}
          aria-required={'true'}
          tabIndex={0}
          {...rest}
        />
      </div>
    </div>
  );
}

export const NewAltinnInput = withStyles(NewInputStyling)(NewInput);

export interface IAltinnInputCompontentProvidedProps extends React.InputHTMLAttributes<any> {
  fullWidth?: boolean;
  iconString?: string;
}

export interface IAltinnInputComponentState {
}

// const theme = createMuiTheme(altinnTheme);

const styles = {
  searchBox: {
    background: 'none',
    height: 36,
  },
  searchBoxEnabled: {
    border: '1px solid ' + theme.altinnPalette.primary.blueDark,
  },
  searchBoxDisabled: {
    border: '1px solid ' + theme.altinnPalette.primary.grey,
  },
  altinnInput: {
    fontSize: '16px',
    color: theme.altinnPalette.primary.black,
    padding: '6px',
  },
  altinnInputIcon: {
    color: theme.altinnPalette.primary.black,
    fontSize: '25px',
    marginLeft: '5px',
    padding: 6,
  },
};

// tslint:disable-next-line:max-line-length
export class AltinnInput extends React.Component<IAltinnInputCompontentProvidedProps, IAltinnInputComponentState> {
  public render() {
    const { iconString, ...rest } = this.props;
    return (
      <FormControl
        classes={{
          root: classNames(classes.searchBox, {
            [classes.searchBoxEnabled]: !this.props.disabled,
            [classes.searchBoxDisabled]: this.props.disabled,
          }),
        }}
        fullWidth={true}
        style={{
          width: this.props.width ? this.props.width : null,
        }}
      >
        <Grid item={true}>
          {!iconString !== null &&
            <i className={`${classes.altinnInputIcon} ${iconString}`} />
          }
          <TextField
            disabled={this.props.disabled}
            id={this.props.id}
            placeholder={this.props.placeholder}
            InputProps={{
              disableUnderline: true,
              classes: { root: classNames(classes.altinnInput) },
            }}
            {...rest}
          />
        </Grid>
      </FormControl>
    );
  }
}

export default withStyles(styles)(AltinnInput);
