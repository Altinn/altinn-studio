import React, { useEffect, useRef } from 'react';
import classes from './AltinnConfirmDialog.module.css';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { StudioButton, StudioPopover } from '@studio/components-legacy';
import type {
  StudioButtonProps,
  StudioPopoverProps,
  StudioPopoverTriggerProps,
} from '@studio/components-legacy';
import type { WithDataAttributes } from 'app-shared/types/WithDataAttributes';

export type AltinnConfirmDialogProps = {
  confirmText?: string;
  confirmColor?: StudioButtonProps['color'];
  cancelText?: string;
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClose: (event: React.MouseEvent<HTMLButtonElement> | MouseEvent) => void;
  triggerProps?: WithDataAttributes<StudioPopoverTriggerProps>;
  className?: string;
} & Partial<Pick<StudioPopoverProps, 'open' | 'placement' | 'children'>>;

export function AltinnConfirmDialog({
  confirmText,
  confirmColor = 'danger',
  cancelText,
  onConfirm,
  onClose,
  placement,
  children,
  triggerProps,
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
      <StudioPopover variant='warning' placement={placement} open={open}>
        <StudioPopover.Trigger {...triggerProps} />
        <StudioPopover.Content className={cn(className, classes.popover)}>
          {children}
          <div className={classes.buttonContainer}>
            <StudioButton
              color={confirmColor}
              variant='primary'
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onConfirm(event);
                onClose(event);
              }}
              size='small'
            >
              {confirmText || t('general.yes')}
            </StudioButton>
            <StudioButton
              color='second'
              variant='tertiary'
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onClose(event);
              }}
              size='small'
            >
              {cancelText || t('general.cancel')}
            </StudioButton>
          </div>
        </StudioPopover.Content>
      </StudioPopover>
    </div>
  );
}
