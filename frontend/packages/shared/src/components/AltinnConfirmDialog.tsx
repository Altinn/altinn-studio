import React, { useEffect, useRef } from 'react';
import classes from './AltinnConfirmDialog.module.css';
import type { PopoverProps } from '@digdir/design-system-react';
import { Button, Popover } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

export type AltinnConfirmDialogProps = {
  confirmText?: string;
  confirmColor?: 'inverted' | 'danger' | 'primary' | 'secondary' | 'success';
  cancelText?: string;
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClose: (event: React.MouseEvent<HTMLButtonElement> | MouseEvent) => void;
} & Partial<Pick<PopoverProps, 'open' | 'trigger' | 'placement' | 'children' | 'className'>>;

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
      <Popover
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
            variant='filled'
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
            color='secondary'
            variant='quiet'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onClose(event);
            }}
            size='small'
          >
            {cancelText || t('general.cancel')}
          </Button>
        </div>
      </Popover>
    </div>
  );
}
