import React, { useState } from 'react';
import classes from './RemindChoiceDialog.module.css';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
import { StudioButton, StudioParagraph, StudioPopover } from '@studio/components';
import cn from 'classnames';

export type RemindChoiceDialogProps = {
  closeDialog: () => void;
  closeDialogPermanently: () => void;
};

export const RemindChoiceDialog = ({
  closeDialog,
  closeDialogPermanently,
}: RemindChoiceDialogProps) => {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  return (
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger
        variant='tertiary'
        className={classes.closeButton}
        aria-label={t('general.close')}
      >
        <XMarkIcon />
      </StudioPopover.Trigger>
      <StudioPopover
        placement='bottom'
        data-color='info'
        className={cn(classes.popover, !opened && classes.closed)}
        onOpen={() => setOpened(!opened)}
        onClose={() => setOpened(false)}
      >
        <StudioParagraph>{t('session.reminder')}</StudioParagraph>
        <div className={classes.buttons}>
          <StudioButton onClick={closeDialog}>{t('session.do_show_again')}</StudioButton>
          <StudioButton onClick={closeDialogPermanently} variant='secondary'>
            {t('session.dont_show_again')}
          </StudioButton>
        </div>
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};
