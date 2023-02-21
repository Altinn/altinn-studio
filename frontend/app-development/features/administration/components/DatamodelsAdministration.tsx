import React from 'react';
import { useTranslation } from 'react-i18next';

export function DatamodelsAdministration() {
  const { t } = useTranslation();
  return (
    <div>
      <p>{t('administration.datamodels_info1')}</p>
      <p>{t('administration.datamodels_info2')}</p>
      <p>
        {t('administration.datamodels_info3')}&nbsp;
        <a href='https://docs.altinn.studio/app/development/data/data-model/'>
          {t('administration.datamodels_info_link')}
        </a>
      </p>
    </div>
  );
}
