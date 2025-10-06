import React from 'react';

import { Popover } from '@digdir/designsystemet-react';

import { Button } from 'src/app-components/Button/Button';
import classes from 'src/features/alertOnChange/DeleteWarningPopover.module.css';
import { Lang } from 'src/features/language/Lang';

export interface IDeleteWarningPopover {
  children?: React.ReactNode;
  onPopoverDeleteClick: () => void;
  onCancelClick: () => void;
  deleteButtonText: string;
  messageText: React.ReactNode;
  open: boolean;
  popoverId?: string;
  setOpen: (open: boolean) => void;
  placement?: 'bottom' | 'left' | 'right' | 'top';
  withTrigger?: boolean;
}

export function DeleteWarningPopover({
  children,
  onPopoverDeleteClick,
  onCancelClick,
  deleteButtonText,
  messageText,
  placement = 'bottom',
  popoverId,
  open,
  setOpen,
  withTrigger = true,
}: IDeleteWarningPopover) {
  return (
    <Popover.TriggerContext>
      {withTrigger ? (
        <Popover.Trigger
          asChild
          onClick={() => setOpen(!open)}
        >
          {children}
        </Popover.Trigger>
      ) : (
        children
      )}
      <Popover
        data-testid='delete-warning-popover'
        id={popoverId}
        open={open}
        placement={placement}
        data-color='warning'
      >
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
      </Popover>
    </Popover.TriggerContext>
  );
}
