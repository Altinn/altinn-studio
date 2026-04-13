import type { ReactElement } from 'react';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { BotAccount } from 'app-shared/types/BotAccount';
import { useGetBotAccountApiKeysQuery } from '../../hooks/useGetBotAccountApiKeysQuery';
import { useCreateBotAccountApiKeyMutation } from '../../hooks/useCreateBotAccountApiKeyMutation';
import { useRevokeBotAccountApiKeyMutation } from '../../hooks/useRevokeBotAccountApiKeyMutation';
import { ApiKeysList } from '../../../../../../components/ApiKeys/ApiKeysList';
import { AddApiKey } from '../../../../../../components/ApiKeys/AddApiKey';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';
import classes from './BotAccountApiKeys.module.css';
import { StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';

type BotAccountApiKeysProps = {
  org: string;
  botAccountId: string;
};

export const BotAccountApiKeys = ({ org, botAccountId }: BotAccountApiKeysProps): ReactElement => {
  const { t } = useTranslation();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: apiKeys, isPending, isError } = useGetBotAccountApiKeysQuery(org, botAccountId);
  const {
    mutate: createApiKey,
    isPending: isCreating,
    error: createApiKeyError,
    reset: resetCreateApiKey,
  } = useCreateBotAccountApiKeyMutation(org, botAccountId);
  const {
    mutate: revokeApiKey,
    isPending: isRevoking,
    variables: revokingKeyId,
  } = useRevokeBotAccountApiKeyMutation(org, botAccountId);

  // Update bot accounts cache with API key count
  useEffect(() => {
    if (apiKeys) {
      queryClient.setQueryData(
        [QueryKey.BotAccounts, org],
        (prevBotAccounts: BotAccount[] | undefined) => {
          if (!prevBotAccounts) return prevBotAccounts;
          return prevBotAccounts.map((ba) =>
            ba.id === botAccountId ? { ...ba, apiKeyCount: apiKeys.length } : ba,
          );
        },
      );
    }
  }, [apiKeys, botAccountId, org, queryClient]);

  const isDuplicateName = (name: string): boolean =>
    apiKeys?.some((apiKey) => apiKey.name === name.trim()) ||
    (createApiKeyError?.response?.status === ServerCodes.Conflict &&
      createApiKeyError?.response?.data?.errorCode === ApiErrorCodes.DuplicateTokenName) ||
    false;

  const handleSave = (name: string, expiresAt: string) => {
    createApiKey(
      { name, expiresAt: `${expiresAt}T23:59:59Z` },
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
      <StudioHeading level={3} data-size='sm'>
        {t('settings.orgs.bot_accounts.col_api_keys')}
      </StudioHeading>
      <div className={classes.content}>
        <ApiKeysList
          apiKeys={apiKeys}
          isPending={isPending}
          isError={isError}
          onDelete={revokeApiKey}
          deletingId={isRevoking ? revokingKeyId : undefined}
          highlightId={highlightId}
          showCreatedBy
        />
        <AddApiKey
          onSave={handleSave}
          isSaving={isCreating}
          newApiKey={newApiKey}
          onDialogClose={() => setNewApiKey(null)}
          isDuplicateName={isDuplicateName}
          onNameChange={resetCreateApiKey}
        />
      </div>
    </div>
  );
};
