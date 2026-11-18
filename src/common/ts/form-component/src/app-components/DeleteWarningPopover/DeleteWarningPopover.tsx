import type { ReactNode } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { Popover } from '@digdir/designsystemet-react';

import classes from './DeleteWarningPopover.module.css';

export interface DeleteWarningPopoverProps {
  /** The trigger element. A click on it toggles the popover. */
  children?: ReactNode;
  onPopoverDeleteClick: () => void;
  onCancelClick: () => void;
  deleteButtonText: string;
  cancelButtonText: ReactNode;
  messageText: ReactNode;
  open: boolean;
  popoverId?: string;
  setOpen: (open: boolean) => void;
  placement?: 'bottom' | 'left' | 'right' | 'top';
}

/**
 * A warning popover that asks the user to confirm a change or deletion, opened and closed from the outside,
 * such as by `useAlertOnChange`.
 */
export function DeleteWarningPopover({
  children,
  onPopoverDeleteClick,
  onCancelClick,
  deleteButtonText,
  cancelButtonText,
  messageText,
  placement = 'bottom',
  popoverId,
  open,
  setOpen,
}: DeleteWarningPopoverProps) {
  return (
    <Popover.TriggerContext>
      <Popover.Trigger asChild onClick={() => setOpen(!open)}>
        {children}
      </Popover.Trigger>
      <Popover id={popoverId} open={open} placement={placement} data-color='warning'>
        <div>{messageText}</div>
        <div className={classes.popoverButtonContainer}>
          <Button color='danger' onClick={onPopoverDeleteClick}>
            {deleteButtonText}
          </Button>
          <Button variant='tertiary' color='second' onClick={onCancelClick}>
            {cancelButtonText}
          </Button>
        </div>
      </Popover>
    </Popover.TriggerContext>
  );
}
