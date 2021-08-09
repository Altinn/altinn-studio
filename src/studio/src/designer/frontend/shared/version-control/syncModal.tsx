import { Button, CircularProgress, createTheme, createStyles, Grid, Popover, TextField, Typography, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface ISyncModalComponentProps {
  classes: any;
  anchorEl: Element;
  header?: string;
  descriptionText?: string[];
  isLoading?: boolean;
  shouldShowDoneIcon?: boolean;
  btnText?: string;
  shouldShowCommitBox?: boolean;
  handleClose: any;
  btnClick?: any;
}

export interface ISyncModalComponentState {
  commitMessage: string;
}

const theme = createTheme(altinnTheme);

const styles = createStyles({
  button: {
    fontSize: '14px',
    color: theme.altinnPalette.primary.white,
    background: theme.altinnPalette.primary.blueDark,
    maxWidth: '150px',
    textTransform: 'none',
    fontWeight: 400,
    marginTop: '20px',
    borderRadius: '0',
    '&:hover': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
  },
  popover: {
    width: '445px',
    margin: '24px',
  },
  header: {
    fontSize: '16px',
    fontWeight: 500,
  },
  subHeader: {
    fontSize: '16px',
    marginTop: '10px',
    whiteSpace: 'pre-line',
  },
  spinner: {
    marginTop: '20px',
    color: theme.altinnPalette.primary.blueDark,
    marginRight: 'auto',
    marginLeft: 'auto',
  },
  doneLoadingIcon: {
    marginTop: '20px',
    color: theme.altinnPalette.primary.green,
    marginRight: 'auto',
    marginLeft: 'auto',
  },
  commitMessageField: {
    border: `1px solid ${theme.altinnPalette.primary.blueDark}`,
    boxSizing: 'border-box',
    marginTop: '10px',
    fontSize: '16px !Important',
    minHeight: '88px',
    lineHeight: '1.3',
  },
});

class SyncModalComponent extends React.Component<ISyncModalComponentProps, ISyncModalComponentState> {
  constructor(_props: ISyncModalComponentProps) {
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
    }
    if (this.props.shouldShowDoneIcon) {
      return (
        <div className={classNames(classes.doneLoadingIcon)}>
          <i className={classNames('fa fa-circlecheck')} />
        </div>
      );
    }
    return null;
  }

  public render() {
    const { classes } = this.props;
    const open = Boolean(this.props.anchorEl);
    return (
      <Popover
        open={open}
        anchorEl={this.props.anchorEl}
        onClose={this.handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        anchorReference='anchorEl'
      >
        <Grid
          container={true} direction='column'
          className={classes.popover}
        >
          {this.props.header &&
            <Typography variant='h3' className={classNames(classes.header)}>
              {this.props.header}
            </Typography>
          }

          {this.props.descriptionText &&
            <Typography className={classNames(classes.subHeader)}>
              {this.props.descriptionText.map((text: any, index: any) => {
                // eslint-disable-next-line max-len
                return this.props.descriptionText.length - 1 !== index ? (<span key={index}> {`${text}\n\n`} </span>) : <span key={index}>{text}</span>;
              })}
            </Typography>
          }

          {this.renderSpinnerOrDoneIcon()}

          {this.props.shouldShowCommitBox &&
            <TextField
              id='test'
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

          {this.props.btnText &&
            <Button
              variant='contained'
              color='primary'
              className={classes.button}
              onClick={this.btnClickedHandler}
              id='share_changes_modal_button'
            >
              {this.props.btnText}
            </Button>
          }
        </Grid>
      </Popover>
    );
  }
}

export default withStyles(styles)(SyncModalComponent);
