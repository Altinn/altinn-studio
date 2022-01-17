import { createTheme, createStyles, Popper } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnPopperComponentProvidedProps {
  classes: any;
  styleObj?: object;
  message?: string;
  anchorEl: any;
}

const theme = createTheme(altinnTheme);

const styles = createStyles({
  snackbar_error: {
    color: theme.altinnPalette.primary.black,
    background: theme.altinnPalette.primary.redLight,
    borderRadius: 0,
    boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)',
    fontSize: 16,
    padding: '12px 24px 12px 24px',
    maxWidth: '550px',
    marginTop: 10,
  },
});

export class AltinnPopper extends React.Component<IAltinnPopperComponentProvidedProps> {
  public render() {
    const { classes } = this.props;
    const open = Boolean(this.props.anchorEl);
    return (
      <Popper
        open={open}
        anchorEl={this.props.anchorEl}
        className={classNames(classes.snackbar_error, this.props.styleObj)}
        placement={'bottom-start'}
      >
        {this.props.message}
      </Popper>
    );
  }
}

export default withStyles(styles)(AltinnPopper);
