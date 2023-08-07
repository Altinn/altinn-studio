import React, { useEffect, useRef } from 'react';
import classes from './AltinnConfirmPopover.module.css';
import type { PopoverProps } from '@digdir/design-system-react';
import { Button, ButtonColor, ButtonVariant, Popover, PopoverVariant } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export type AltinnConfirmPopoverProps = {
  confirmText?: string;
  confirmColor?: ButtonColor;
  cancelText?: string;
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onCancel:(event: React.MouseEvent<HTMLButtonElement> | MouseEvent) => void;
} & Partial<Pick<PopoverProps, 'open' | 'trigger' | 'placement' | 'children' | 'className'>>;

export function AltinnConfirmPopover({
  confirmText,
  confirmColor = ButtonColor.Danger,
  cancelText,
  onConfirm,
  onCancel,
  placement = 'right',
  children,
  trigger = <div className={classes.trigger} />,
  open = false,
  className,
}: AltinnConfirmPopoverProps) {
  const { t } = useTranslation();

  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onCancel(event);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  },[onCancel, open]);

  return (
    <div
      ref={popoverRef}
      className={className}
    >
      <Popover
        variant={PopoverVariant.Warning}
        className={classes.popover}
        trigger={trigger}
        placement={placement}
        open={open}
      >
        {children}
        <div className={classes.buttonContainer}>
          <Button
            color={confirmColor}
            variant={ButtonVariant.Filled}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              onConfirm(event);
              onCancel(event);
            }}
            className={classes.confirmButton}
          >
            {confirmText || t('general.yes')}
          </Button>
          <Button
            color={ButtonColor.Secondary}
            variant={ButtonVariant.Quiet}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              onCancel(event);
            }}
          >
            {cancelText || t('general.cancel')}
          </Button>
        </div>
      </Popover>
    </div>
  );
}
