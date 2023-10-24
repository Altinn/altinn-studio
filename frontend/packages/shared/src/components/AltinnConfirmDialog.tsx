import React, { useEffect, useRef } from 'react';
import classes from './AltinnConfirmDialog.module.css';
import type { ButtonProps, LegacyPopoverProps } from '@digdir/design-system-react';
import { Button, LegacyPopover } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

export type AltinnConfirmDialogProps = {
  confirmText?: string;
  confirmColor?: ButtonProps['color'];
  cancelText?: string;
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClose: (event: React.MouseEvent<HTMLButtonElement> | MouseEvent) => void;
} & Partial<Pick<LegacyPopoverProps, 'open' | 'trigger' | 'placement' | 'children' | 'className'>>;

export function AltinnConfirmDialog({
  confirmText,
  confirmColor = 'danger',
  cancelText,
  onConfirm,
  onClose,
  placement,
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
  }, [onClose, open]);

  return (
    <div ref={dialogRef}>
      <LegacyPopover
        variant='warning'
        className={cn(className, classes.popover)}
        trigger={trigger}
        placement={placement}
        open={open}
      >
        {children}
        <div className={classes.buttonContainer}>
          <Button
            color={confirmColor}
            variant='primary'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onConfirm(event);
              onClose(event);
            }}
            className={classes.confirmButton}
            size='small'
          >
            {confirmText || t('general.yes')}
          </Button>
          <Button
            color='second'
            variant='tertiary'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onClose(event);
            }}
            size='small'
          >
            {cancelText || t('general.cancel')}
          </Button>
        </div>
      </LegacyPopover>
    </div>
  );
}
