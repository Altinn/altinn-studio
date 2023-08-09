import React, { useEffect, useRef } from 'react';
import classes from './AltinnConfirmDialog.module.css';
import type { PopoverProps } from '@digdir/design-system-react';
import { Button, ButtonColor, ButtonVariant, Popover, PopoverVariant } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

export type AltinnConfirmDialogProps = {
  confirmText?: string;
  confirmColor?: ButtonColor;
  cancelText?: string;
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClose:(event: React.MouseEvent<HTMLButtonElement> | MouseEvent) => void;
} & Partial<Pick<PopoverProps, 'open' | 'trigger' | 'placement' | 'children' | 'className'>>;

export function AltinnConfirmDialog({
  confirmText,
  confirmColor = ButtonColor.Danger,
  cancelText,
  onConfirm,
  onClose,
  placement = 'right',
  children,
  trigger = <div />,
  open = false,
  className,
}: AltinnConfirmDialogProps) {
  const { t } = useTranslation();

  const dialogRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        onClose(event);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  },[onClose, open]);

  return (
    <div
      ref={dialogRef}
    >
      <Popover
        variant={PopoverVariant.Warning}
        className={cn(className, classes.popover)}
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
              event.stopPropagation();
              onConfirm(event);
              onClose(event);
            }}
            className={classes.confirmButton}
          >
            {confirmText || t('general.yes')}
          </Button>
          <Button
            color={ButtonColor.Secondary}
            variant={ButtonVariant.Quiet}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onClose(event);
            }}
          >
            {cancelText || t('general.cancel')}
          </Button>
        </div>
      </Popover>
    </div>
  );
}
