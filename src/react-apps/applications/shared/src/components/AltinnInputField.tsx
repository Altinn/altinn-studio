import { createMuiTheme, createStyles, FormControl, TextField, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';
import AltinnButton from './AltinnButton';

export interface IAltinnInputFieldComponentProvidedProps {
  btnText?: string;
  classes: any;
  focusOnComponentDidUpdate?: boolean;
  id: string;
  inputDescription?: string;
  inputFieldStyling?: object;
  inputHeader?: string;
  inputValue?: string;
  isDisabled?: boolean;
  onBlurFunction?: any;
  onBtnClickFunction?: any;
  onChangeFunction?: any;
  placeholder?: any;
  textAreaRows?: number;
}

export interface IAltinnInputFieldComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  inputHeader: {
    fontSize: '24px',
  },
  descriptionInput: {
    fontSize: '16px',
    marginTop: '10px',
  },
  inputField: {
    border: '1px solid ' + theme.altinnPalette.primary.blueDark,
    marginTop: '10px',
    marginBottom: '24px',
    background: 'none',
    width: '386px',
  },
  inputFieldText: {
    fontSize: '16px',
    color: theme.altinnPalette.primary.black + '!Important',
    padding: '6px',
  },
  disabled: {
    border: '1px solid ' + theme.altinnPalette.primary.greyMedium,
  },
  btn: {
    marginTop: '10px',
    marginBottom: '24px',
  },
});

// tslint:disable-next-line:max-line-length
class AltinnInputField extends React.Component<IAltinnInputFieldComponentProvidedProps, IAltinnInputFieldComponentState> {
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
      <div>
        {this.props.inputHeader &&
          <Typography className={classes.inputHeader}>
            {this.props.inputHeader}
          </Typography>
        }
        {this.props.inputDescription &&
          <Typography className={classes.descriptionInput}>
            {this.props.inputDescription}
          </Typography>
        }
        <FormControl
          classes={{
            root: classNames(
              classes.inputField, { [classes.disabled]: this.props.isDisabled }),
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
            multiline={this.props.textAreaRows ? true : false}
            rows={this.props.textAreaRows || null}
            InputProps={{
              disableUnderline: true,
              classes: { root: classNames(classes.inputFieldText) },
            }}
          />

        </FormControl>
        {this.props.btnText &&
          <AltinnButton
            btnText={this.props.btnText}
            secondaryButton={true}
            onClickFunction={this.props.onBtnClickFunction}
            className={classNames(classes.btn)}
          />
        }
      </div>
    );
  }
}

export default withStyles(styles)(AltinnInputField);
