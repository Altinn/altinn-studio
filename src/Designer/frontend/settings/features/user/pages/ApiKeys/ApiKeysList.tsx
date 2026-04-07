import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioDeleteButton,
  StudioError,
  StudioSpinner,
  StudioTable,
  StudioTag,
} from '@studio/components';
import { useUserApiKeysQuery } from '../../hooks/queries/useUserApiKeysQuery';
import { useDeleteUserApiKeyMutation } from '../../hooks/mutations/useDeleteUserApiKeyMutation';
import classes from './ApiKeysList.module.css';

type ApiKeysListProps = {
  newApiKeyId: number | null;
};

export const ApiKeysList = ({ newApiKeyId }: ApiKeysListProps): React.ReactElement => {
  const { t } = useTranslation();

  const {
    data: apiKeys,
    isPending,
    isError,
  } = useUserApiKeysQuery({
    hideDefaultError: true,
  });
  const {
    mutate: deleteUserApiKey,
    isPending: pendingDeleteApiKey,
    variables: deletingApiKeyId,
  } = useDeleteUserApiKeyMutation();

  const sortedApiKeys = useMemo(
    () => [...(apiKeys ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [apiKeys],
  );

  if (isPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('settings.user.api_keys.loading')} />;
  }

  if (isError) {
    return <StudioError>{t('settings.user.api_keys.error')}</StudioError>;
  }

  const now = new Date();

  return (
    <StudioTable>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.HeaderCell>{t('settings.user.api_keys.name')}</StudioTable.HeaderCell>
          <StudioTable.HeaderCell>{t('settings.user.api_keys.expires_at')}</StudioTable.HeaderCell>
          <StudioTable.HeaderCell>{t('settings.user.api_keys.created_at')}</StudioTable.HeaderCell>
          <StudioTable.HeaderCell className={classes.deleteCell}></StudioTable.HeaderCell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        {sortedApiKeys.map((apiKey) => (
          <StudioTable.Row
            key={apiKey.id}
            className={apiKey.id === newApiKeyId ? classes.newRow : undefined}
          >
            <StudioTable.Cell className={classes.nameCell}>{apiKey.name}</StudioTable.Cell>
            <StudioTable.Cell className={classes.dateCell}>
              {new Date(apiKey.expiresAt).toLocaleDateString()}
              {new Date(apiKey.expiresAt) < now && (
                <StudioTag data-color='danger' className={classes.expiredTag}>
                  {t('settings.user.api_keys.expired')}
                </StudioTag>
              )}
            </StudioTable.Cell>
            <StudioTable.Cell className={classes.dateCell}>
              {new Date(apiKey.createdAt).toLocaleDateString()}
            </StudioTable.Cell>
            <StudioTable.Cell className={classes.deleteCell}>
              <StudioDeleteButton
                aria-label={t('settings.user.api_keys.delete', { name: apiKey.name })}
                onDelete={() => deleteUserApiKey(apiKey.id)}
                confirmMessage={t('settings.user.api_keys.delete_confirm')}
                disabled={pendingDeleteApiKey && deletingApiKeyId === apiKey.id}
              />
            </StudioTable.Cell>
          </StudioTable.Row>
        ))}
      </StudioTable.Body>
    </StudioTable>
  );
};
