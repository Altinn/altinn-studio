import { createMuiTheme, createStyles, FormControl, TextField, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnInputFieldComponentProvidedProps {
  classes: any;
  id: string;
  placeholder?: any;
  onChangeFunction?: any;
  inputHeader?: string;
  inputDescription?: string;
  inputValue?: string;
  onBlurFunction?: any;
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
    color: '#000000',
    padding: '6px',
  },
});

// tslint:disable-next-line:max-line-length
class AltinnInputField extends React.Component<IAltinnInputFieldComponentProvidedProps, IAltinnInputFieldComponentState> {
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
          classes={{ root: classNames(classes.inputField) }}
          fullWidth={true}
          id={this.props.id}
        >
          <TextField
            onBlur={this.props.onBlurFunction}
            onChange={this.props.onChangeFunction}
            value={this.props.inputValue}
            placeholder={this.props.placeholder}
            InputProps={{
              disableUnderline: true,
              classes: { root: classNames(classes.inputFieldText) },
            }}
          />
        </FormControl>
      </div>
    );
  }
}

export default withStyles(styles)(AltinnInputField);
