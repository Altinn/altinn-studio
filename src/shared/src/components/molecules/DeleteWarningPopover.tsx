import * as React from 'react';

import { Button, ButtonVariant, ButtonColor, PanelVariant, PopoverPanel } from '@altinn/altinn-design-system';
import { makeStyles } from '@material-ui/core';
import type { ILanguage } from '../../types';
import { getLanguageFromKey } from '../../utils/language';

const useStyles = makeStyles({
  popoverButtonContainer: {
    display: 'flex',
    marginTop: '1rem',
    gap: '1rem',
  },
});

export interface IDeleteWarningPopover {
  open: boolean;
  setPopoverOpen: (open: boolean) => void;
  trigger: React.ReactNode;
  language: ILanguage;
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
  language,
  onPopoverDeleteClick,
  onCancelClick,
  deleteButtonText,
  messageText,
  side = 'bottom',
}: IDeleteWarningPopover) {
  const classes = useStyles();
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
          {getLanguageFromKey('general.cancel', language)}
        </Button>
      </div>
    </PopoverPanel>
  );
}
