import * as React from 'react';
import { WithStyles, createStyles, withStyles, Popover, CircularProgress, Typography, TextField, Button, Grid } from '@material-ui/core';
import classNames = require('classnames');

export interface ILargePopoverComponentProvidedProps {
  classes: any;
  anchorEl: any;
  header?: string;
  descriptionText?: string;
  isLoading?: boolean;
  shouldShowDoneIcon?: boolean;
  btnText?: string;
  shouldShowCommitBox?: boolean;
  handleClose: any;
  btnClick?: any;
}

export interface ILargePopoverComponentProps extends ILargePopoverComponentProvidedProps {

}

export interface ILargePopoverComponentState {
  commitMessage: string;
}

const styles = createStyles({
  color: {
    color: '#022F51',
  },
  color_p: {
    color: '#0062BA',
  },
  bold: {
    fontWeigth: '500',
  },
  button: {
    fontSize: '14px',
    color: '#FFFFFF',
    background: '#0062BA',
    maxWidth: '150px',
    textTransform: 'none',
    fontWeight: 400,
    marginTop: '20px',
    borderRadius: '0',
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
  },
  spinner: {
    marginTop: '20px',
    color: '#0062BA',
    marginRight: 'auto',
    marginLeft: 'auto',
  },
  doneLoadingIcon: {
    marginTop: '20px',
    color: '#17C96B',
    marginRight: 'auto',
    marginLeft: 'auto',
  },
  commitMessageField: {
    border: '1px solid #0062BA',
    boxSizing: 'border-box',
    marginTop: '10px',
    fontSize: '16px !Important',
    minHeight: '88px',
    lineHeight: '1.3',
  },
});

class LargePopoverComponent extends React.Component<ILargePopoverComponentProps, ILargePopoverComponentState> {
  constructor(_props: ILargePopoverComponentProps) {
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
            <i className={classNames('ai ai-circlecheck')} />
          </div>
        );
      }
      return null;
    }
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
            <Button variant='contained' color='primary' className={classes.button} onClick={this.btnClickedHandler}>
              {this.props.btnText}
            </Button>
          }
        </Grid>
      </Popover>
    );
  }
}

export default withStyles(styles)(LargePopoverComponent);
