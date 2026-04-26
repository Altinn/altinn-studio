import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading, StudioParagraph } from '@studio/components';
import { useUserApiKeysQuery } from '../../hooks/queries/useUserApiKeysQuery';
import { useDeleteUserApiKeyMutation } from '../../hooks/mutations/useDeleteUserApiKeyMutation';
import { useAddUserApiKeyMutation } from '../../hooks/mutations/useAddUserApiKeyMutation';
import { ApiKeysList } from '../../../../components/ApiKeys/ApiKeysList';
import { AddApiKey } from '../../../../components/ApiKeys/AddApiKey';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';
import classes from './ApiKeys.module.css';

export const ApiKeys = (): React.ReactElement => {
  const { t } = useTranslation();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<number | undefined>(undefined);

  const { data: apiKeys, isPending, isError } = useUserApiKeysQuery({ hideDefaultError: true });
  const {
    mutate: addUserApiKey,
    isPending: isAdding,
    error: addApiKeyError,
    reset: resetAddApiKey,
  } = useAddUserApiKeyMutation();
  const {
    mutate: deleteUserApiKey,
    isPending: pendingDeleteApiKey,
    variables: deletingApiKeyId,
  } = useDeleteUserApiKeyMutation();

  const isDuplicateName = (name: string): boolean =>
    apiKeys?.some((apiKey) => apiKey.name === name.trim()) ||
    (addApiKeyError?.response?.status === ServerCodes.Conflict &&
      addApiKeyError?.response?.data?.errorCode === ApiErrorCodes.DuplicateTokenName) ||
    false;

  const handleSave = (name: string, expiresAt: string) => {
    addUserApiKey(
      { name: name.trim(), expiresAt: `${expiresAt}T23:59:59Z` },
      {
        onSuccess: (response) => {
          setNewApiKey(response.key);
          setHighlightId(response.id);
        },
      },
    );
  };

  return (
    <div className={classes.container}>
      <div className={classes.heading}>
        <StudioHeading level={2} data-size='md'>
          {t('settings.user.api_keys.api_keys')}
        </StudioHeading>
        <StudioParagraph data-size='md'>{t('settings.user.api_keys.description')}</StudioParagraph>
      </div>
      <div className={classes.content}>
        <ApiKeysList
          apiKeys={apiKeys}
          isPending={isPending}
          isError={isError}
          onDelete={deleteUserApiKey}
          deletingId={pendingDeleteApiKey ? deletingApiKeyId : undefined}
          highlightId={highlightId}
        />
        <AddApiKey
          onSave={handleSave}
          isSaving={isAdding}
          newApiKey={newApiKey}
          onDialogClose={() => setNewApiKey(null)}
          isDuplicateName={isDuplicateName}
          onNameChange={resetAddApiKey}
        />
      </div>
    </div>
  );
};
