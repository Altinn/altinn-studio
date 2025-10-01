import React, { useEffect, useRef } from 'react';
import classes from './AltinnConfirmDialog.module.css';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { StudioPopover } from '@studio/components-legacy';
import type { StudioPopoverProps, StudioPopoverTriggerProps } from '@studio/components-legacy';
import type { StudioButtonProps } from '@studio/components';
import { StudioButton } from '@studio/components';
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
              data-size='small' // can be removed once parent chain is designsystem v1/not legacy
              data-color={confirmColor}
              variant='primary'
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onConfirm(event);
                onClose(event);
              }}
            >
              {confirmText || t('general.yes')}
            </StudioButton>
            <StudioButton
              data-size='small' // can be removed once parent chain is designsystem v1/not legacy
              color='second'
              variant='tertiary'
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onClose(event);
              }}
            >
              {cancelText || t('general.cancel')}
            </StudioButton>
          </div>
        </StudioPopover.Content>
      </StudioPopover>
    </div>
  );
}
