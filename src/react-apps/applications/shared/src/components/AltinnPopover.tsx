import { Button, CircularProgress, createMuiTheme, createStyles, Grid, Popover, TextField, Typography, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnPopoverProvidedProps {
  anchorEl: any;
  anchorOrigin?: {
    horizontal: 'left' | 'center' | 'right' | number,
    vertical: 'top' | 'center' | 'bottom' | number,
  };
  btnClick?: any;
  btnConfirmText?: string;
  btnCancelText?: string;
  btnPrimaryId?: string;
  btnSecondaryId?: string;
  classes: any;
  descriptionText?: string;
  handleClose: any;
  header?: string;
  isLoading?: boolean;
  nextTobtnConfirmText?: string;
  paperProps?: any;
  shouldShowCommitBox?: boolean;
  shouldShowDoneIcon?: boolean;
  transformOrigin?: {
    horizontal: 'left' | 'center' | 'right' | number,
    vertical: 'top' | 'center' | 'bottom' | number,
  };
}

export interface IAltinnPopoverProps extends IAltinnPopoverProvidedProps {

}

export interface IAltinnPopoverState {
  commitMessage: string;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  borderBottom: {
    borderBottom: '1px solid' + altinnTheme.altinnPalette.primary.blueDark,
  },
  buttonCancel: {
    'fontSize': '14px',
    'color': theme.altinnPalette.primary.blueDarker,
    'background': theme.altinnPalette.primary.white,
    'textTransform': 'none',
    'fontWeight': 400,
    'marginTop': '20px',
    'borderRadius': '0',
    '&:hover': {
      color: theme.altinnPalette.primary.blueDarker,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
  },
  buttonConfirm: {
    'fontSize': '14px',
    'color': theme.altinnPalette.primary.white,
    'background': theme.altinnPalette.primary.blueDark,
    'textTransform': 'none',
    'fontWeight': 400,
    'marginTop': '20px',
    'borderRadius': '0',
    '&:hover': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
  },
  commitMessageField: {
    border: '1px solid ' + theme.altinnPalette.primary.blueDark,
    boxSizing: 'border-box',
    marginTop: '10px',
    fontSize: '16px !Important',
    minHeight: '88px',
    lineHeight: '1.3',
  },
  doneLoadingIcon: {
    marginTop: '20px',
    color: theme.altinnPalette.primary.green,
    marginRight: 'auto',
    marginLeft: 'auto',
  },
  header: {
    fontSize: '16px',
    fontWeight: 500,
  },
  spinner: {
    marginTop: '20px',
    color: theme.altinnPalette.primary.blueDark,
    marginRight: 'auto',
    marginLeft: 'auto',
  },
  subHeader: {
    fontSize: '16px',
    marginTop: '10px',
  },
  popover: {
    width: '445px',
    margin: '24px',
  },
});

export class AltinnPopover extends React.Component<IAltinnPopoverProps, IAltinnPopoverState> {
  constructor(_props: IAltinnPopoverProps) {
    super(_props);
    this.state = {
      commitMessage: '',
    };
  }

  public handleClose = () => {
    this.setState({
      commitMessage: '',
    });
    this.props.handleClose();
  }

  public btnClickedHandler = () => {
    if (this.props.btnClick) {
      this.props.btnClick(this.state.commitMessage);
    }
  }

  public handleChange = (event: any) => {
    this.setState({
      commitMessage: event.target.value,
    });
  }

  public renderSpinnerOrDoneIcon() {
    const { classes } = this.props;
    if (this.props.isLoading) {
      return (
        <CircularProgress className={classNames(classes.spinner)} />
      );
    } else {
      if (this.props.shouldShowDoneIcon) {
        return (
          <div className={classNames(classes.doneLoadingIcon)}>
            <i className={classNames('fa fa-circlecheck')} />
          </div>
        );
      }
      return null;
    }
  }

  public render() {
    const { anchorOrigin, classes, paperProps, transformOrigin } = this.props;
    const open = Boolean(this.props.anchorEl);

    return (
      <Popover
        open={open}
        anchorEl={this.props.anchorEl}
        onClose={this.handleClose}
        anchorOrigin={{
          horizontal: anchorOrigin.horizontal ? anchorOrigin.horizontal : 'left',
          vertical: anchorOrigin.vertical ? anchorOrigin.vertical : 'top',
        }}
        transformOrigin={{
          horizontal: transformOrigin.horizontal ? transformOrigin.horizontal : 'left',
          vertical: transformOrigin.vertical ? transformOrigin.vertical : 'top',
        }}
        anchorReference='anchorEl'
        PaperProps={{ square: true, ...paperProps }}
      >
        <Grid container={true} direction='column' className={classes.popover}>
          {this.props.header &&
            <Typography variant='h3' className={classNames(classes.header)}>
              {this.props.header}
            </Typography>
          }

          {this.props.descriptionText &&
            <Typography className={classNames(classes.subHeader)}>
              {this.props.descriptionText}
            </Typography>
          }

          {this.renderSpinnerOrDoneIcon()}

          {this.props.shouldShowCommitBox &&
            <TextField
              multiline={true}
              value={this.state.commitMessage}
              rows={3}
              onChange={this.handleChange}
              InputProps={{
                disableUnderline: true,
                classes: {
                  input: classes.commitMessageField,
                },
              }}
            />
          }

          <div>
            {this.props.btnConfirmText &&
              <Button
                id={this.props.btnPrimaryId}
                variant='contained'
                color='primary'
                className={classes.buttonConfirm}
                onClick={this.btnClickedHandler}
              >
                {this.props.btnConfirmText}
              </Button>
            }
            {this.props.btnCancelText &&
              <Button
                id={this.props.btnSecondaryId}
                color='primary'
                className={classes.buttonCancel}
                onClick={this.props.handleClose}
              >
                <span className={classes.borderBottom}>
                  {this.props.btnCancelText}
                </span>
              </Button>
            }
          </div>
        </Grid>
      </Popover>
    );
  }
}

export default withStyles(styles)(AltinnPopover);
