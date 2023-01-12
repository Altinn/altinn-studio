import React from 'react';
import type { PopoverOrigin } from '@mui/material';
import { Button, Grid, Popover } from '@mui/material';
import classes from './AltinnPopoverSimple.module.css';

export interface IAltinnPopoverProps {
  anchorEl: any;
  anchorOrigin: PopoverOrigin;
  ariaLabel?: string;
  backgroundColor?: string;
  btnCancelText?: string;
  btnClick?: any;
  btnConfirmText?: string;
  btnPrimaryId?: string;
  btnSecondaryId?: string;
  children: React.ReactNode;
  handleClose: any;
  paperProps?: any;
  testId?: string;
  transformOrigin?: PopoverOrigin;
  open: boolean;
}

const defaultAnchorOrigin: PopoverOrigin = {
  horizontal: 'left',
  vertical: 'top',
};

const defaultTransformOrigin: PopoverOrigin = {
  horizontal: 'left',
  vertical: 'top',
};

export const AltinnPopoverSimple = (props: IAltinnPopoverProps) => {
  const { anchorOrigin = defaultAnchorOrigin, transformOrigin = defaultTransformOrigin } = props;

  const handleButtonClose = (event: React.MouseEvent<HTMLElement>) =>
    props.handleClose('close', event);

  const btnClickedHandler = (event: React.MouseEvent<HTMLElement>) => {
    if (props.btnClick) {
      props.btnClick(event);
    }
  };

  return (
    <>
      <Popover
        open={props.open}
        anchorEl={props.anchorEl}
        onClose={props.handleClose}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        anchorReference={props.anchorEl ? 'anchorEl' : 'none'}
        PaperProps={{ square: true, ...props.paperProps }}
        aria-label={props.ariaLabel ? props.ariaLabel : ''}
        data-testid={props.testId}
      >
        <Grid container={true} direction='column' sx={{ width: '445px', margin: '24px' }}>
          <Grid item={true}>
            <div>{props.children}</div>
          </Grid>
          <Grid item={true}>
            <div>
              {props.btnConfirmText && (
                <Button
                  id={props.btnPrimaryId}
                  variant='contained'
                  color='primary'
                  className={classes.buttonConfirm}
                  onClick={btnClickedHandler}
                  disableTouchRipple={true}
                >
                  {props.btnConfirmText}
                </Button>
              )}
              {props.btnCancelText && (
                <Button
                  id={props.btnSecondaryId}
                  color='primary'
                  className={classes.buttonCancel}
                  onClick={handleButtonClose}
                  disableTouchRipple={true}
                >
                  <span className={classes.borderBottom}>{props.btnCancelText}</span>
                </Button>
              )}
            </div>
          </Grid>
        </Grid>
      </Popover>
    </>
  );
};
