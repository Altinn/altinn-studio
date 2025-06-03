import React, { useState } from 'react';
import classes from './PreviewLimitationsInfo.module.css';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Alert } from '@digdir/designsystemet-react';
import { XMarkIcon } from '@studio/icons';
import { typedLocalStorage } from '@studio/pure-functions';
import { StudioButton, StudioParagraph, StudioPopover } from '@studio/components';

export const PreviewLimitationsInfo = () => {
  const { t } = useTranslation();
  const [openSaveChoiceInSession, setOpenShowSaveChoiceInSession] = useState<boolean>(false);
  const showPreviewLimitationsInfoSession: boolean = typedLocalStorage.getItem(
    'showPreviewLimitationsInfo',
  );
  const [showPreviewLimitationsInfo, setShowPreviewLimitationsInfo] = useState<boolean>(
    showPreviewLimitationsInfoSession ?? true,
  );

  const handleHidePreviewLimitations = () => {
    setShowPreviewLimitationsInfo(false);
    setOpenShowSaveChoiceInSession(false);
  };

  const handleRememberChoiceForSession = () => {
    typedLocalStorage.setItem('showPreviewLimitationsInfo', false);
    handleHidePreviewLimitations();
  };

  if (!showPreviewLimitationsInfo) return null;

  return (
    <Alert severity='info'>
      <div className={classes.alert}>
        {t('preview.limitations_info')}
        <StudioPopover open={openSaveChoiceInSession}>
          <StudioPopover.Trigger
            onClick={() => setOpenShowSaveChoiceInSession(!openSaveChoiceInSession)}
            variant='tertiary'
            icon={<XMarkIcon />}
          />
          <StudioPopover.Content className={classes.popoverContent}>
            <StudioParagraph className={classes.message}>{t('session.reminder')}</StudioParagraph>
            <StudioButton
              className={cn(classes.yesButton, classes.button)}
              onClick={handleHidePreviewLimitations}
              variant='secondary'
            >
              {t('session.do_show_again')}
            </StudioButton>
            <StudioButton
              className={cn(classes.noButton, classes.button)}
              onClick={handleRememberChoiceForSession}
              variant='secondary'
            >
              {t('session.dont_show_again')}
            </StudioButton>
          </StudioPopover.Content>
        </StudioPopover>
      </div>
    </Alert>
  );
};
