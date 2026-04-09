import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioHeading, StudioParagraph } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { AddApiKeyDialog } from './AddApiKeyDialog/AddApiKeyDialog';
import { ApiKeysList } from './ApiKeysList';
import classes from './ApiKeys.module.css';

export const ApiKeys = (): React.ReactElement => {
  const { t } = useTranslation();
  const [newApiKeyId, setNewApiKeyId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={classes.container}>
      <StudioHeading level={2}>{t('settings.user.api_keys.api_keys')}</StudioHeading>
      <StudioParagraph>{t('settings.user.api_keys.description')}</StudioParagraph>
      <ApiKeysList newApiKeyId={newApiKeyId} />
      <div className={classes.addButtonWrapper}>
        <StudioButton
          variant='secondary'
          icon={<PlusIcon />}
          onClick={() => setIsOpen(true)}
          className={classes.addButton}
        >
          {t('settings.user.api_keys.add')}
        </StudioButton>
      </div>
      {isOpen && (
        <AddApiKeyDialog onApiKeyCreated={setNewApiKeyId} onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};
