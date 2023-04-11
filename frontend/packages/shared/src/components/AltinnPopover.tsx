import React from 'react';
import classNames from 'classnames';
import classes from './AltinnPopover.module.css';
import { Button, ButtonColor, TextArea } from '@digdir/design-system-react';
import { ButtonContainer } from 'app-shared/primitives';
import { CircularProgress, Grid, Popover } from '@mui/material';

export interface AltinnPopoverProps {
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

export const AltinnPopover = (props: AltinnPopoverProps) => {
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
        {props.header && <h3>{props.header}</h3>}

        {props.descriptionText && (
          <div className={classNames(classes.subHeader)}>{props.descriptionText}</div>
        )}

        {renderSpinnerOrDoneIcon()}

        {props.shouldShowCommitBox && (
          <TextArea value={commitMessage} rows={3} onChange={handleChange} />
        )}

        <ButtonContainer>
          {props.btnConfirmText && (
            <Button id={props.btnPrimaryId} color={ButtonColor.Primary} onClick={btnClickedHandler}>
              {props.btnConfirmText}
            </Button>
          )}
          {props.btnCancelText && (
            <Button
              id={props.btnSecondaryId}
              color={ButtonColor.Inverted}
              onClick={props.handleClose}
            >
              <span className={classes.borderBottom}>{props.btnCancelText}</span>
            </Button>
          )}
        </ButtonContainer>
      </Grid>
    </Popover>
  );
};
