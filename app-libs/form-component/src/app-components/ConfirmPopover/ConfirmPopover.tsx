import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button, Popover } from '@digdir/designsystemet-react';

import classes from './ConfirmPopover.module.css';

export interface ConfirmPopoverProps {
  children: ReactNode;
  message: ReactNode;
  confirmText: ReactNode;
  cancelText: ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  color?: 'warning' | 'danger';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  popoverId?: string;
}

export function ConfirmPopover({
  children,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  color = 'warning',
  placement = 'left',
  popoverId,
}: ConfirmPopoverProps) {
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    onConfirm();
  }

  function handleCancel() {
    setOpen(false);
    onCancel?.();
  }

  return (
    <Popover.TriggerContext>
      <Popover.Trigger asChild onClick={() => setOpen((prev) => !prev)}>
        {children}
      </Popover.Trigger>
      <Popover
        id={popoverId}
        open={open}
        onClose={handleCancel}
        placement={placement}
        data-color={color}
      >
        <div className={classes.message}>{message}</div>
        <div className={classes.buttonContainer}>
          <Button data-size='sm' color='danger' onClick={handleConfirm}>
            {confirmText}
          </Button>
          <Button data-size='sm' variant='tertiary' color='second' onClick={handleCancel}>
            {cancelText}
          </Button>
        </div>
      </Popover>
    </Popover.TriggerContext>
  );
}
