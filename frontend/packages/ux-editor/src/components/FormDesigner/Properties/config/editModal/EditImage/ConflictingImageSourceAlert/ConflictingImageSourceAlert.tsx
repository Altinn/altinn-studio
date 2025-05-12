import React from 'react';
import classes from './ConflictingImageSourceAlert.module.css';
import { Alert } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

interface ConflictingImageSourceAlertProps {
  showAlert: boolean;
  conflictSource: 'external' | 'relative';
}

export const ConflictingImageSourceAlert = ({
  showAlert,
  conflictSource,
}: ConflictingImageSourceAlertProps) => {
  const { t } = useTranslation();

  return (
    showAlert && (
      <Alert size='small' className={classes.alert}>
        {conflictSource === 'external'
          ? t('ux_editor.properties_panel.images.conflicting_image_source_when_entering_url')
          : t('ux_editor.properties_panel.images.conflicting_image_source_when_uploading_image')}
      </Alert>
    )
  );
};
