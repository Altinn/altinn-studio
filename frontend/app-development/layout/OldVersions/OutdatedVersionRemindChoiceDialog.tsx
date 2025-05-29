import React, { useState } from 'react';
import classes from './OutdatedVersionRemindChoiceDialog.module.css';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
import { StudioButton, StudioParagraph, StudioPopover } from '@studio/components';
import cn from 'classnames';

export type OutdatedVersionRemindChoiceDialogProps = {
  close: () => void;
  setShowOutdatedVersionDialog: () => void;
};

export const OutdatedVersionRemindChoiceDialog = ({
  setShowOutdatedVersionDialog,
  close,
}: OutdatedVersionRemindChoiceDialogProps) => {
  const { t } = useTranslation();
  const handleRememberChoiceForSession = () => {
    setShowOutdatedVersionDialog();
  };

  const [opened, setOpened] = useState(false);

  return (
    <div>
      <StudioPopover.TriggerContext>
        <StudioPopover.Trigger variant='tertiary' className={classes.closeButton}>
          <XMarkIcon />
        </StudioPopover.Trigger>
        <StudioPopover
          placement='bottom'
          data-variant='tinted'
          data-color='warning'
          className={cn(classes.popover, !opened && classes.closed)}
          onOpen={() => setOpened(!opened)}
          onClose={() => setOpened(false)}
        >
          <StudioParagraph>{t('session.reminder')}</StudioParagraph>
          <div className={classes.buttons}>
            <StudioButton onClick={close}>{t('session.do_show_again')}</StudioButton>
            <StudioButton onClick={handleRememberChoiceForSession}>
              {t('session.dont_show_again')}
            </StudioButton>
          </div>
        </StudioPopover>
      </StudioPopover.TriggerContext>
    </div>
  );
};
