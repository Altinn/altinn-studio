import React from 'react';
import { useTranslation } from 'react-i18next';
import classes from './UnsupportedVersionAlert.module.css';
import { VersionAlert } from './VersionAlert';

export const UnsupportedVersionAlert = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.container}>
      <VersionAlert title={t('version_alerts.unsupported_version_title')}>
        {t('version_alerts.unsupported_version_content')}
      </VersionAlert>
    </div>
  );
};
