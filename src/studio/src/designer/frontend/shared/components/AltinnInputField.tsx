import React from 'react';
import { createTheme, FormControl, TextField, Typography } from '@mui/material';
import { createStyles, withStyles } from '@mui/styles';
import classNames from 'classnames';
import altinnTheme from '../theme/altinnStudioTheme';
import AltinnButton from './AltinnButton';
import ErrorPopover from './ErrorPopover';

export interface IAltinnInputFieldComponentProvidedProps {
  btnText?: string;
  classes: any;
  focusOnComponentDidUpdate?: boolean;
  id: string;
  inputDescription?: string;
  inputFieldStyling?: object;
  inputHeader?: string;
  inputValue?: string | number;
  isDisabled?: boolean;
  onBlurFunction?: any;
  onBtnClickFunction?: any;
  onChangeFunction?: any;
  placeholder?: any;
  textAreaRows?: number;
  inputHeaderStyling?: object;
  inputDescriptionStyling?: object;
  type?: any;
  textFieldId?: string;
  fullWidth?: boolean;
  error?: string;
  clearError?: () => void;
  onReturn?: React.KeyboardEventHandler;
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
    marginTop: '10px',
  },
  inputElement: {
    border: `1px solid ${theme.altinnPalette.primary.blueDark}`,
    marginTop: '10px',
    background: 'none',
    width: '386px',
    height: '19px',
  },
  inputFieldText: {
    fontSize: '16px',
    color: `${theme.altinnPalette.primary.black}!Important`,
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
  disabled: {
    border: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
    backgroundColor: theme.altinnPalette.primary.greyLight,
  },
  btn: {
    marginTop: '10px',
  },
  fullWidth: {
    width: '100% !important',
  },
});

class AltinnInputFieldComponent extends React.Component<IAltinnInputFieldComponentProvidedProps> {
  public textInput: any;

  public errorRef: any;

  constructor(props: any) {
    super(props);
    this.textInput = React.createRef();
    this.errorRef = React.createRef();
  }

  public componentDidUpdate() {
    if (this.props.focusOnComponentDidUpdate) {
      this.textInput.current.focus();
    }
  }

  private onKeyDown(e: React.KeyboardEvent) {
    if (this.props.onReturn && e.key === 'Enter' && !this.props.error) {
      e.preventDefault();
      this.props.onReturn(e);
    }
  }

  public render() {
    const { classes } = this.props;
    return (
      <>
        {this.props.inputHeader && (
          <Typography
            style={this.props.inputHeaderStyling}
            className={classNames(classes.inputHeader)}
            variant='h2'
          >
            {this.props.inputHeader}
          </Typography>
        )}
        {this.props.inputDescription && (
          <Typography
            component='label'
            htmlFor={this.props.textFieldId}
            style={this.props.inputDescriptionStyling}
            className={classNames(classes.descriptionInput, {
              [classes.marginTop_10]: this.props.inputHeader,
            })}
          >
            {this.props.inputDescription}
          </Typography>
        )}
        <FormControl
          classes={{
            root: classNames(classes.inputField, {
              [classes.disabled]: this.props.isDisabled,
              [classes.marginTop_10]:
                this.props.inputDescription || this.props.inputHeader,
              [classes.fullWidth]: this.props.fullWidth,
            }),
          }}
          style={this.props.inputFieldStyling}
          fullWidth={true}
          id={this.props.id}
        >
          <TextField
            inputRef={this.textInput}
            onBlur={this.props.onBlurFunction}
            onChange={this.props.onChangeFunction}
            value={this.props.inputValue}
            placeholder={this.props.placeholder}
            disabled={this.props.isDisabled}
            multiline={!!this.props.textAreaRows}
            minRows={this.props.textAreaRows || null}
            InputProps={{
              classes: {
                root: classes.inputFieldText,
              },
            }}
            inputProps={{
              sx: {
                border: `1px solid ${theme.altinnPalette.primary.blueDark}`,
                marginTop: '10px',
                background: 'none',
                width: '386px',
                height: '19px',
              },
            }}
            sx={{
              '& fieldset': {
                border: 'none',
              },
            }}
            type={this.props.type}
            id={this.props.textFieldId}
            onKeyDown={
              this.props.onReturn &&
              ((e: React.KeyboardEvent<HTMLDivElement>) => this.onKeyDown(e))
            }
          />
        </FormControl>
        {this.props.btnText && (
          <AltinnButton
            btnText={this.props.btnText}
            secondaryButton={true}
            onClickFunction={this.props.onBtnClickFunction}
            className={classNames(classes.btn)}
            disabled={!!this.props.error}
          />
        )}
        <div ref={this.errorRef} />
        <ErrorPopover
          anchorEl={this.props.error ? this.errorRef.current : null}
          onClose={this.props.clearError}
          errorMessage={this.props.error}
        />
      </>
    );
  }
}

export default withStyles(styles)(AltinnInputFieldComponent);
