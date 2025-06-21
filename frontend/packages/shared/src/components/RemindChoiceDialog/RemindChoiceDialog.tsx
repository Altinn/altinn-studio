import React, { useState } from 'react';
import classes from './RemindChoiceDialog.module.css';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
import { StudioButton, StudioParagraph, StudioPopover } from '@studio/components';

export type RemindChoiceDialogProps = {
  closeDialog: (permanentlyDismiss: boolean) => void;
};

export const RemindChoiceDialog = ({ closeDialog }: RemindChoiceDialogProps) => {
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
        className={classes.popover}
        onOpen={() => setOpened(true)}
        onClose={() => setOpened(false)}
      >
        {opened && (
          <>
            <StudioParagraph>{t('session.reminder')}</StudioParagraph>
            <div className={classes.buttons}>
              <StudioButton onClick={() => closeDialog(false)}>
                {t('session.do_show_again')}
              </StudioButton>
              <StudioButton onClick={() => closeDialog(true)} variant='secondary'>
                {t('session.dont_show_again')}
              </StudioButton>
            </div>
          </>
        )}
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};
