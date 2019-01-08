import { createMuiTheme, FormControl, TextField, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnInputFieldCompontentProvidedProps {
  classes: any;
  id: string;
  placeholder?: any;
  onChangeFunction?: any;
  inputHeader?: string;
  inputDescription?: string;
}

export interface IAltinnInputFieldComponentState {
}

const theme = createMuiTheme(altinnTheme);

const styles = {
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
};

// tslint:disable-next-line:max-line-length
class AltinnInputField extends React.Component<IAltinnInputFieldCompontentProvidedProps, IAltinnInputFieldComponentState> {
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
        >
          <TextField
            id='test'
            // onChange={this.props.onChangeFunction}
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
