import React, { useState } from 'react';
import classes from './PreviewLimitationsInfo.module.css';
import { useTranslation } from 'react-i18next';
import { Alert } from '@digdir/designsystemet-react';
import { typedLocalStorage } from '@studio/pure-functions';
import { RemindChoiceDialog } from '../RemindChoiceDialog/RemindChoiceDialog';

export const PreviewLimitationsInfo = () => {
  const { t } = useTranslation();
  const showPreviewLimitationsInfoSession: boolean = typedLocalStorage.getItem(
    'showPreviewLimitationsInfo',
  );
  const [showPreviewLimitationsInfo, setShowPreviewLimitationsInfo] = useState<boolean>(
    showPreviewLimitationsInfoSession ?? true,
  );

  const handleHidePreviewLimitations = () => {
    setShowPreviewLimitationsInfo(false);
  };

  const handleRememberChoiceForSession = () => {
    typedLocalStorage.setItem('showPreviewLimitationsInfo', false);
    handleHidePreviewLimitations();
  };

  if (!showPreviewLimitationsInfo) return null;

  return (
    <Alert severity='info' className={classes.alert}>
      {t('preview.limitations_info')}
      <RemindChoiceDialog
        closeDialog={handleHidePreviewLimitations}
        closeDialogPermanently={handleRememberChoiceForSession}
      />
    </Alert>
  );
};
