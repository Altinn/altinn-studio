import { createMuiTheme, createStyles, IconButton, Modal, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnModalComponentProvidedProps {
  classes: any;
  headerText?: any;
  isOpen: boolean;
  onClose: any;
}

export interface IAltinnModalComponentState {
  isOpen: boolean;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  modal: {
    width: '876px',
    backgroundColor: theme.altinnPalette.primary.white,
    boxShadow: theme.shadows[5],
    outline: 'none',
    marginRight: 'auto',
    marginLeft: 'auto',
    marginTop: '10%',
    marginBottom: '10%',
  },
  header: {
    backgroundColor: altinnTheme.altinnPalette.primary.blueDarker,
    height: '96px',
    paddingLeft: 48,
    paddingTop: 30,
    paddingBottom: 30,
  },
  headerText: {
    fontSize: '28px',
    color: altinnTheme.altinnPalette.primary.white,
  },
  body: {
    paddingLeft: 90,
    paddingRight: 243,
    paddingTop: 45,
    paddingBottom: 34,
  },
  iconBtn: {
    float: 'right' as 'right',
    paddingRight: 20,
    marginTop: '-27px',
  },
  iconStyling: {
    color: altinnTheme.altinnPalette.primary.white,
    fontSize: 38,
  },
  scroll: {
    overflow: 'overlay',
  },
});

export class AltinnModal extends React.Component<IAltinnModalComponentProvidedProps, IAltinnModalComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <Modal
        open={this.props.isOpen}
        className={this.props.classes.scroll}
      >
        <div className={classes.modal}>
          <div className={classes.header}>
            <IconButton className={classes.iconBtn} onClick={this.props.onClose}>
              <i className={classNames('ai ai-exit-test', classes.iconStyling)} />
            </IconButton >
            <Typography className={classes.headerText}>
              {this.props.headerText}
            </Typography>
          </div>
          <div className={classes.body}>
            {this.props.children}
          </div>
        </div>
      </Modal>
    );
  }
}

export default withStyles(styles)(AltinnModal);
