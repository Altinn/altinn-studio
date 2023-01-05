import React from 'react';
import {
  Button,
  CircularProgress,
  Grid,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import classNames from 'classnames';
import classes from './AltinnPopover.module.css';

export interface IAltinnPopoverProvidedProps {
  anchorEl: any;
  anchorOrigin?: {
    horizontal: 'left' | 'center' | 'right' | number;
    vertical: 'top' | 'center' | 'bottom' | number;
  };
  btnClick?: any;
  btnConfirmText?: string;
  btnCancelText?: string;
  btnPrimaryId?: string;
  btnSecondaryId?: string;
  classes: any;
  descriptionText?: string;
  handleClose: () => void;
  header?: string;
  isLoading?: boolean;
  paperProps?: any;
  shouldShowCommitBox?: boolean;
  shouldShowDoneIcon?: boolean;
  transformOrigin?: {
    horizontal: 'left' | 'center' | 'right' | number;
    vertical: 'top' | 'center' | 'bottom' | number;
  };
}

const AltinnPopoverComponent = (props: any) => {

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
      return <CircularProgress className={classNames(classes.spinner)} role='progressbar' />;
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
        <Grid container={true} direction='column' className={classes.popover}>
          {props.header && <Typography variant='h3'>{props.header}</Typography>}

          {props.descriptionText && (
            <Typography className={classNames(classes.subHeader)}>
              {props.descriptionText}
            </Typography>
          )}

          {renderSpinnerOrDoneIcon()}

          {props.shouldShowCommitBox && (
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
          )}

          <div>
            {props.btnConfirmText && (
              <Button
                id={props.btnPrimaryId}
                variant='contained'
                color='primary'
                className={classNames([classes.buttonCommon, classes.buttonConfirm])}
                onClick={btnClickedHandler}
              >
                {props.btnConfirmText}
              </Button>
            )}
            {props.btnCancelText && (
              <Button
                id={props.btnSecondaryId}
                color='primary'
                className={classNames([classes.buttonCommon, classes.buttonCancel])}
                onClick={props.handleClose}
              >
                <span className={classes.borderBottom}>{props.btnCancelText}</span>
              </Button>
            )}
          </div>
        </Grid>
      </Popover>
    </>
  );
};

export default AltinnPopoverComponent;
