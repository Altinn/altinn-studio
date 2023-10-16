import React from 'react';

import { Button, Popover } from '@digdir/design-system-react';
import { makeStyles } from '@material-ui/core';

import { useLanguage } from 'src/hooks/useLanguage';

const useStyles = makeStyles({
  popoverButtonContainer: {
    display: 'flex',
    marginTop: '0.625rem',
    gap: '0.625rem',
  },
});

export interface IDeleteWarningPopover {
  children: React.ReactNode;
  onPopoverDeleteClick: () => void;
  onCancelClick: () => void;
  deleteButtonText: string;
  messageText: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  placement?: 'bottom' | 'left' | 'right' | 'top';
}

export function DeleteWarningPopover({
  children,
  onPopoverDeleteClick,
  onCancelClick,
  deleteButtonText,
  messageText,
  placement = 'bottom',
  open,
  setOpen,
}: IDeleteWarningPopover) {
  const classes = useStyles();
  const { lang } = useLanguage();
  return (
    <Popover
      variant='warning'
      placement={placement}
      trigger={children}
      open={open}
      onOpenChange={() => setOpen(!open)}
    >
      <div>{messageText}</div>
      <div className={classes.popoverButtonContainer}>
        <Button
          data-testid='warning-popover-delete-button'
          variant='filled'
          size='small'
          color='danger'
          onClick={onPopoverDeleteClick}
        >
          {deleteButtonText}
        </Button>
        <Button
          data-testid='warning-popover-cancel-button'
          variant='quiet'
          size='small'
          color='second'
          onClick={onCancelClick}
        >
          {lang('general.cancel')}
        </Button>
      </div>
    </Popover>
  );
}
