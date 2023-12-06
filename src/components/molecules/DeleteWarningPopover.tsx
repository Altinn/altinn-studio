import React from 'react';

import { Button, LegacyPopover } from '@digdir/design-system-react';

import classes from 'src/components/molecules/DeleteWarningPopover.module.css';
import { Lang } from 'src/features/language/Lang';

export interface IDeleteWarningPopover {
  children: React.ReactNode;
  onPopoverDeleteClick: () => void;
  onCancelClick: () => void;
  deleteButtonText: string;
  messageText: React.ReactNode;
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
  return (
    <LegacyPopover
      variant='warning'
      placement={placement}
      trigger={children}
      open={open}
      className={classes.popover}
      onOpenChange={() => setOpen(!open)}
    >
      <div>{messageText}</div>
      <div className={classes.popoverButtonContainer}>
        <Button
          data-testid='warning-popover-delete-button'
          variant='primary'
          size='small'
          color='danger'
          onClick={onPopoverDeleteClick}
        >
          {deleteButtonText}
        </Button>
        <Button
          data-testid='warning-popover-cancel-button'
          variant='tertiary'
          size='small'
          color='second'
          onClick={onCancelClick}
        >
          <Lang id={'general.cancel'} />
        </Button>
      </div>
    </LegacyPopover>
  );
}
