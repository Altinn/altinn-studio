import { Button, CircularProgress, createMuiTheme, createStyles, Grid, makeStyles, Popover, TextField, Typography } from '@material-ui/core';
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

const useStyles = makeStyles(() => createStyles({
  borderBottom: {
    borderBottom: `1px solid ${altinnTheme.altinnPalette.primary.blueDark}`,
  },
  buttonCancel: {
    fontSize: '14px',
    color: theme.altinnPalette.primary.blueDarker,
    background: theme.altinnPalette.primary.white,
    textTransform: 'none',
    fontWeight: 400,
    marginTop: '20px',
    borderRadius: '0',
    '&:hover': {
      color: theme.altinnPalette.primary.blueDarker,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueDarker,
      color: theme.altinnPalette.primary.white,
    },
  },
  buttonConfirm: {
    fontSize: '14px',
    color: theme.altinnPalette.primary.white,
    background: theme.altinnPalette.primary.blueDark,
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
  commitMessageField: {
    border: `1px solid ${theme.altinnPalette.primary.blueDark}`,
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
}));

const AltinnPopoverComponent = (props: any) => {
  const classes = useStyles(props);

  const [commitMessage, setCommitMessage] = React.useState('');

  const handleClose = () => {
    setCommitMessage('');
    props.handleClose();
  };

  const btnClickedHandler = () => {
    if (props.btnClick) {
      props.btnClick(commitMessage);
    }
  };

  const handleChange = (event: any) => {
    setCommitMessage(event.target.value);
  };

  const renderSpinnerOrDoneIcon = () => {
    if (props.isLoading) {
      return (
        <CircularProgress className={classNames(classes.spinner)} />
      );
    }
    if (props.shouldShowDoneIcon) {
      return (
        <div className={classNames(classes.doneLoadingIcon)}>
          <i className={classNames('fa fa-circlecheck')} />
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Popover
        open={!!props.anchorEl}
        anchorEl={props.anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          horizontal: props.anchorOrigin.horizontal ? props.anchorOrigin.horizontal : 'left',
          vertical: props.anchorOrigin.vertical ? props.anchorOrigin.vertical : 'top',
        }}
        transformOrigin={{
          horizontal: props.transformOrigin.horizontal ? props.transformOrigin.horizontal : 'left',
          vertical: props.transformOrigin.vertical ? props.transformOrigin.vertical : 'top',
        }}
        anchorReference='anchorEl'
        PaperProps={{ square: true, ...props.paperProps }}
      >
        <Grid
          container={true} direction='column'
          className={classes.popover}
        >
          {props.header &&
            <Typography variant='h3' className={classNames(classes.header)}>
              {props.header}
            </Typography>
          }

          {props.descriptionText &&
            <Typography className={classNames(classes.subHeader)}>
              {props.descriptionText}
            </Typography>
          }

          {renderSpinnerOrDoneIcon()}

          {props.shouldShowCommitBox &&
            <TextField
              multiline={true}
              value={commitMessage}
              rows={3}
              onChange={handleChange}
              InputProps={{
                disableUnderline: true,
                classes: {
                  input: classes.commitMessageField,
                },
              }}
            />
          }

          <div>
            {props.btnConfirmText &&
              <Button
                id={props.btnPrimaryId}
                variant='contained'
                color='primary'
                className={classes.buttonConfirm}
                onClick={btnClickedHandler}
              >
                {props.btnConfirmText}
              </Button>
            }
            {props.btnCancelText &&
              <Button
                id={props.btnSecondaryId}
                color='primary'
                className={classes.buttonCancel}
                onClick={props.handleClose}
              >
                <span className={classes.borderBottom}>
                  {props.btnCancelText}
                </span>
              </Button>
            }
          </div>
        </Grid>
      </Popover>
    </>
  );
};

export default AltinnPopoverComponent;
