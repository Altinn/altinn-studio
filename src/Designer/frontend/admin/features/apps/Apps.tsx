import React from 'react';
import { useParams } from 'react-router-dom';
import { AppsTable } from './components/AppsTable';
import { useTranslation } from 'react-i18next';

export const Apps = () => {
  const { t } = useTranslation();
  const { org } = useParams() as { org: string };

  return (
    <div>
      <h1>{t('admin.apps.title')}</h1>
      <AppsTable org={org} />
    </div>
  );
};
