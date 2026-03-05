import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';
import { AddPersonalAccessToken } from './AddPersonalAccessToken';
import { PersonalAccessTokensList } from './PersonalAccessTokensList';
import classes from './PersonalAccessTokens.module.css';

export const PersonalAccessTokens = (): React.ReactElement => {
  const { t } = useTranslation();
  const [newTokenId, setNewTokenId] = useState<number | null>(null);

  return (
    <div className={classes.container}>
      <StudioHeading level={2}>
        {t('user.settings.personal_access_tokens.personal_access_tokens')}
      </StudioHeading>
      <AddPersonalAccessToken onTokenCreated={setNewTokenId} />
      <PersonalAccessTokensList newTokenId={newTokenId} />
    </div>
  );
};
