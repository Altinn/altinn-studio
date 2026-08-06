import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { Popover } from '@digdir/designsystemet-react';

import classes from './ConfirmPopover.module.css';

export interface ConfirmPopoverProps {
  /**
   * The trigger element. When omitted, the popover has no trigger of its own and must be opened from
   * the outside (controlled mode). Positioning then relies on another element in the document
   * carrying `popoverTarget={popoverId}`, so pass `popoverId` in that case.
   */
  children?: ReactNode;
  message: ReactNode;
  confirmText: ReactNode;
  cancelText: ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  /**
   * Open state. When provided, the popover is controlled from the outside (e.g. by `useAlertOnChange`,
   * where the popover opens as a consequence of the value changing rather than a click on the
   * trigger), and `onOpenChange` is called instead of the internal state being updated.
   */
  open?: boolean;
  /** Called with the requested open state when the popover is controlled. */
  onOpenChange?: (open: boolean) => void;
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
  open: controlledOpen,
  onOpenChange,
  color = 'warning',
  placement = 'left',
  popoverId,
}: ConfirmPopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  function setOpen(next: boolean) {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setUncontrolledOpen(next);
    }
  }

  function handleConfirm() {
    onConfirm();
    setOpen(false);
  }

  function handleCancel() {
    setOpen(false);
    onCancel?.();
  }

  return (
    <Popover.TriggerContext>
      {children && (
        <Popover.Trigger asChild onClick={() => setOpen(true)}>
          {children}
        </Popover.Trigger>
      )}
      <Popover
        id={popoverId}
        open={open}
        onClose={() => setOpen(false)}
        placement={placement}
        data-color={color}
      >
        <div className={classes.message}>{message}</div>
        <div className={classes.buttonContainer}>
          <Button color='danger' type='button' onClick={handleConfirm}>
            {confirmText}
          </Button>
          <Button variant='tertiary' color='second' type='button' onClick={handleCancel}>
            {cancelText}
          </Button>
        </div>
      </Popover>
    </Popover.TriggerContext>
  );
}
