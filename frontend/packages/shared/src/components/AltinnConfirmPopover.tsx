import React, { useEffect, useRef } from 'react';
import classes from './AltinnConfirmPopover.module.css';
import type { PopoverProps } from '@digdir/design-system-react';
import { Button, ButtonColor, ButtonVariant, Popover, PopoverVariant } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

export type AltinnConfirmPopoverProps = {
  confirmText?: string;
  confirmColor?: ButtonColor;
  cancelText?: string;
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClose:(event: React.MouseEvent<HTMLButtonElement> | MouseEvent) => void;
} & Partial<Pick<PopoverProps, 'open' | 'trigger' | 'placement' | 'children' | 'className'>>;

export function AltinnConfirmPopover({
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
}: AltinnConfirmPopoverProps) {
  const { t } = useTranslation();

  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
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
      ref={popoverRef}
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
              close(event);
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
              close(event);
            }}
          >
            {cancelText || t('general.cancel')}
          </Button>
        </div>
      </Popover>
    </div>
  );
}
