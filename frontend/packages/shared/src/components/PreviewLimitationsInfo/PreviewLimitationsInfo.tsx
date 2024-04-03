import React, { useState } from 'react';
import classes from './PreviewLimitationsInfo.module.css';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Alert, LegacyPopover } from '@digdir/design-system-react';
import { XMarkIcon } from '@navikt/aksel-icons';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { StudioButton } from '@studio/components';

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
        <LegacyPopover
          trigger={
            <StudioButton
              onClick={() => setOpenShowSaveChoiceInSession(!openSaveChoiceInSession)}
              size='small'
              variant='tertiary'
              icon={<XMarkIcon />}
            />
          }
          open={openSaveChoiceInSession}
        >
          <div className={classes.popoverContent}>
            <p className={classes.message}>{t('session.reminder')}</p>
            <StudioButton
              className={cn(classes.yesButton, classes.button)}
              onClick={handleHidePreviewLimitations}
              size='small'
              variant='secondary'
            >
              {t('session.do_show_again')}
            </StudioButton>
            <StudioButton
              className={cn(classes.noButton, classes.button)}
              onClick={handleRememberChoiceForSession}
              size='small'
              variant='secondary'
            >
              {t('session.dont_show_again')}
            </StudioButton>
          </div>
        </LegacyPopover>
      </div>
    </Alert>
  );
};
