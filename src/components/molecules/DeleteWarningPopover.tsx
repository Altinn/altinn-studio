import React from 'react';

import { PanelVariant, PopoverPanel } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { makeStyles } from '@material-ui/core';

import { useLanguage } from 'src/hooks/useLanguage';

const useStyles = makeStyles({
  popoverButtonContainer: {
    display: 'flex',
    marginTop: '0.625rem',
    gap: '0.625rem',
  },
});

export interface IDeleteWarningPopover {
  open: boolean;
  setPopoverOpen: (open: boolean) => void;
  trigger: React.ReactNode;
  onPopoverDeleteClick: () => void;
  onCancelClick: () => void;
  deleteButtonText: string;
  messageText: string;
  side?: 'bottom' | 'left' | 'right' | 'top';
}

export function DeleteWarningPopover({
  open,
  setPopoverOpen,
  trigger,
  onPopoverDeleteClick,
  onCancelClick,
  deleteButtonText,
  messageText,
  side = 'bottom',
}: IDeleteWarningPopover) {
  const classes = useStyles();
  const { lang } = useLanguage();
  return (
    <PopoverPanel
      variant={PanelVariant.Warning}
      side={side}
      open={open}
      onOpenChange={setPopoverOpen}
      showIcon={false}
      forceMobileLayout={true}
      trigger={trigger}
    >
      <div>{messageText}</div>
      <div className={classes.popoverButtonContainer}>
        <Button
          data-testid='warning-popover-delete-button'
          variant={ButtonVariant.Filled}
          color={ButtonColor.Danger}
          onClick={onPopoverDeleteClick}
        >
          {deleteButtonText}
        </Button>
        <Button
          data-testid='warning-popover-cancel-button'
          variant={ButtonVariant.Quiet}
          color={ButtonColor.Secondary}
          onClick={onCancelClick}
        >
          {lang('general.cancel')}
        </Button>
      </div>
    </PopoverPanel>
  );
}
