import React from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Popover } from '@digdir/designsystemet-react';

import classes from './DeleteWarningPopover.module.css';

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
}

/**
 * A controlled confirmation popover shown before applying a destructive change (e.g. overwriting a
 * selected value). The `open` state is driven from the outside (typically by {@link useAlertOnChange})
 * rather than by the trigger, so it can be wired to the native popover API. Ported from the
 * app-frontend component of the same name.
 */
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
}: IDeleteWarningPopover) {
  const { lang } = useTranslation();

  return (
    <Popover.TriggerContext>
      <Popover.Trigger asChild={!!children} onClick={() => setOpen(!open)}>
        {children}
      </Popover.Trigger>
      <Popover
        data-testid='delete-warning-popover'
        id={popoverId}
        open={open}
        placement={placement}
        data-color='warning'
      >
        <div>{messageText}</div>
        <div className={classes.popoverButtonContainer}>
          <Button color='danger' onClick={onPopoverDeleteClick}>
            {deleteButtonText}
          </Button>
          <Button variant='tertiary' color='second' onClick={onCancelClick}>
            {lang('general.cancel')}
          </Button>
        </div>
      </Popover>
    </Popover.TriggerContext>
  );
}
