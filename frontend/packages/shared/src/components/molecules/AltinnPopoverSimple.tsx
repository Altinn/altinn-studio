import React from 'react';
import classes from './AltinnPopoverSimple.module.css';
import type { PopoverOrigin } from '@mui/material';
import { ButtonContainer } from 'app-shared/primitives';
import { Popover } from '@mui/material';
import { StudioButton } from '@studio/components';

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
    <Popover
      open={props.open}
      anchorEl={props.anchorEl}
      onClose={props.handleClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      anchorReference={props.anchorEl ? 'anchorEl' : 'none'}
      PaperProps={{ square: true, ...props.paperProps }}
      aria-label={props.ariaLabel ? props.ariaLabel : ''}
    >
      <div className={classes.container}>
        <div>{props.children}</div>
        <ButtonContainer>
          {props.btnConfirmText && (
            <StudioButton id={props.btnPrimaryId} color='first' onClick={btnClickedHandler} size='small'>
              {props.btnConfirmText}
            </StudioButton>
          )}
          {props.btnCancelText && (
            <StudioButton
              id={props.btnSecondaryId}
              color='inverted'
              onClick={handleButtonClose}
              size='small'
            >
              {props.btnCancelText}
            </StudioButton>
          )}
        </ButtonContainer>
      </div>
    </Popover>
  );
};
