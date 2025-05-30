import React from 'react';
import { useTranslation } from 'react-i18next';
import classes from './UnsupportedVersion.module.css';
import { VersionAlert } from './VersionAlert';

export const UnsupportedVersion = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.container}>
      <VersionAlert title={t('versions.unsupported_version')}>
        {t('versions.unsupported_old_version')}
      </VersionAlert>
    </div>
  );
};
