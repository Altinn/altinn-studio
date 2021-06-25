import { createMuiTheme, createStyles, FormControl, TextField, Typography, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';
import { AltinnButton } from './AltinnButton';

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
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}

export interface IAltinnInputFieldComponentState {
}

const theme = createMuiTheme(altinnTheme);

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
  inputField: {
    border: `1px solid ${theme.altinnPalette.primary.blueDark}`,
    marginTop: '10px',
    background: 'none',
    width: '386px',
  },
  inputFieldText: {
    fontSize: '16px',
    color: `${theme.altinnPalette.primary.black}!Important`,
    padding: '6px',
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

// eslint-disable-next-line max-len
export class AltinnInputField extends
  React.Component<IAltinnInputFieldComponentProvidedProps, IAltinnInputFieldComponentState> {
  public textInput: any;

  constructor(props: any) {
    super(props);
    this.textInput = React.createRef();
  }

  public componentDidUpdate() {
    if (this.props.focusOnComponentDidUpdate) {
      this.textInput.current.focus();
    }
  }

  public render() {
    const { classes } = this.props;
    return (
      <React.Fragment>
        {this.props.inputHeader &&
          <Typography
            style={this.props.inputHeaderStyling} className={classNames(classes.inputHeader)}
            variant='h2'
          >
            {this.props.inputHeader}
          </Typography>
        }
        {this.props.inputDescription &&
          <Typography
            style={this.props.inputDescriptionStyling}
            className={classNames(classes.descriptionInput, { [classes.marginTop_10]: this.props.inputHeader })}
          >
            {this.props.inputDescription}
          </Typography>
        }
        <FormControl
          classes={{
            root: classNames(
              classes.inputField,
              { [classes.disabled]: this.props.isDisabled },
              { [classes.marginTop_10]: this.props.inputDescription || this.props.inputHeader },
              { [classes.fullWidth]: this.props.fullWidth },
            ),
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
            error={!!this.props.error}
            helperText={this.props.error}
            rows={this.props.textAreaRows || null}
            InputProps={{
              disableUnderline: true,
              classes: { root: classNames(classes.inputFieldText) },
            }}
            type={this.props.type}
            id={this.props.textFieldId}
            onKeyDown={this.props.onKeyDown}
          />

        </FormControl>
        {this.props.btnText &&
          <AltinnButton
            btnText={this.props.btnText}
            secondaryButton={true}
            onClickFunction={this.props.onBtnClickFunction}
            className={classNames(classes.btn)}
            disabled={!!this.props.error}
          />
        }
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(AltinnInputField);
