import React from 'react';

import { Popover } from '@digdir/designsystemet-react';

import { Button } from 'src/app-components/Button/Button';
import classes from 'src/features/alertOnChange/DeleteWarningPopover.module.css';
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
    <Popover
      variant='warning'
      placement={placement}
      open={open}
      onOpenChange={() => setOpen(!open)}
    >
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Content className={classes.popoverContent}>
        <div>{messageText}</div>
        <div className={classes.popoverButtonContainer}>
          <Button
            color='danger'
            onClick={onPopoverDeleteClick}
          >
            {deleteButtonText}
          </Button>
          <Button
            variant='tertiary'
            color='second'
            onClick={onCancelClick}
          >
            <Lang id='general.cancel' />
          </Button>
        </div>
      </Popover.Content>
    </Popover>
  );
}
