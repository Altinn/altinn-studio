import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading, StudioParagraph } from '@studio/components';
import { AddApiKey } from './AddApiKey';
import { ApiKeysList } from './ApiKeysList';
import classes from './ApiKeys.module.css';

export const ApiKeys = (): React.ReactElement => {
  const { t } = useTranslation();
  const [newApiKeyId, setNewApiKeyId] = useState<number | null>(null);

  return (
    <div className={classes.container}>
      <StudioHeading level={2}>{t('settings.user.api_keys.api_keys')}</StudioHeading>
      <StudioParagraph>{t('settings.user.api_keys.description')}</StudioParagraph>
      <ApiKeysList newApiKeyId={newApiKeyId} />
      <AddApiKey onApiKeyCreated={setNewApiKeyId} />
    </div>
  );
};
