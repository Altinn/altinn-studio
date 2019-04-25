import { CircularProgress, createMuiTheme, createStyles, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnSpinnerComponentProvidedProps {
  classes: any;
  id?: string;
  spinnerText?: any;
  styleObj?: object;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  spinner: {
    color: theme.altinnPalette.primary.blueDark,
    marginRight: 'auto',
    marginLeft: 'auto',
    display: 'inline-block',
  },
  spinnerText: {
    display: 'inline-block',
    fontSize: 16,
    marginLeft: '10px',
    verticalAlign: 'middle',
    marginBottom: '25px',
  },
});

class AltinnSpinner extends React.Component<IAltinnSpinnerComponentProvidedProps, any> {
  public render() {
    const { classes } = this.props;
    return (
      <div className={classNames(this.props.styleObj)}>
        <CircularProgress
          className={classNames(classes.spinner)}
          id={this.props.id ? this.props.id : null}
        />
        {this.props.spinnerText &&
          <Typography className={classNames(classes.spinnerText)}>{this.props.spinnerText}</Typography>
        }
      </div>
    );
  }
}

export default withStyles(styles)(AltinnSpinner);
