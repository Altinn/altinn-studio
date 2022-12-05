import React from 'react';
import { Popover } from '@mui/material';
import classes from './ConfirmModal.module.css';
import { Button, ButtonColor } from '@altinn/altinn-design-system';

export interface IConfirmModalProps {
  header: string;
  description: string;
  confirmText: string;
  cancelText: string;
  anchorEl: null | Element;
  open: boolean;
  onClose: (event: React.SyntheticEvent) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal(props: IConfirmModalProps) {
  return (
    <Popover
      open={props.open}
      anchorEl={props.anchorEl}
      anchorOrigin={{
        vertical: 'center',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'center',
        horizontal: 'center',
      }}
      onClose={props.onClose}
    >
      <div className={classes.main}>
        <h2 className={classes.header}>{props.header}</h2>
        <p className={classes.content}>{props.description}</p>
        <div className={classes.buttonContainer}>
          <Button
            onClick={props.onConfirm}
            className={classes.confirmButton}
            color={ButtonColor.Danger}
          >
            {props.confirmText}
          </Button>
          <Button onClick={props.onCancel} color={ButtonColor.Inverted}>
            {props.cancelText}
          </Button>
        </div>
      </div>
    </Popover>
  );
}
