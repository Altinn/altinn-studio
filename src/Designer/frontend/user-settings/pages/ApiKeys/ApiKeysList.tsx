import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioDeleteButton,
  StudioError,
  StudioParagraph,
  StudioSpinner,
  StudioTable,
  StudioTag,
} from '@studio/components';
import { useUserApiKeysQuery } from '../hooks/queries/useUserApiKeysQuery';
import { useDeleteUserApiKeyMutation } from '../hooks/mutations/useDeleteUserApiKeyMutation';
import classes from './ApiKeysList.module.css';

type ApiKeysListProps = {
  newTokenId: number | null;
};

export const ApiKeysList = ({ newTokenId }: ApiKeysListProps): React.ReactElement => {
  const { t } = useTranslation();

  const {
    data: tokens,
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

  const sortedTokens = useMemo(
    () => [...(tokens ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tokens],
  );

  if (isPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('user.settings.api_keys.loading')} />;
  }

  if (isError) {
    return <StudioError>{t('user.settings.api_keys.error')}</StudioError>;
  }

  if (tokens.length === 0) {
    return <StudioParagraph>{t('user.settings.api_keys.no_tokens')}</StudioParagraph>;
  }

  const now = new Date();

  return (
    <StudioTable>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.HeaderCell>{t('user.settings.api_keys.name')}</StudioTable.HeaderCell>
          <StudioTable.HeaderCell>{t('user.settings.api_keys.expires_at')}</StudioTable.HeaderCell>
          <StudioTable.HeaderCell>{t('user.settings.api_keys.created_at')}</StudioTable.HeaderCell>
          <StudioTable.HeaderCell className={classes.deleteCell}></StudioTable.HeaderCell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        {sortedTokens.map((token) => (
          <StudioTable.Row
            key={token.id}
            className={token.id === newTokenId ? classes.newRow : undefined}
          >
            <StudioTable.Cell className={classes.nameCell}>{token.name}</StudioTable.Cell>
            <StudioTable.Cell className={classes.dateCell}>
              {new Date(token.expiresAt).toLocaleDateString()}
              {new Date(token.expiresAt) < now && (
                <StudioTag data-color='danger' className={classes.expiredTag}>
                  {t('user.settings.api_keys.expired')}
                </StudioTag>
              )}
            </StudioTable.Cell>
            <StudioTable.Cell className={classes.dateCell}>
              {new Date(token.createdAt).toLocaleDateString()}
            </StudioTable.Cell>
            <StudioTable.Cell className={classes.deleteCell}>
              <StudioDeleteButton
                onDelete={() => deleteUserApiKey(token.id)}
                confirmMessage={t('user.settings.api_keys.delete_confirm')}
                disabled={pendingDeleteApiKey && deletingApiKeyId === token.id}
              >
                {t('user.settings.api_keys.delete')}
              </StudioDeleteButton>
            </StudioTable.Cell>
          </StudioTable.Row>
        ))}
      </StudioTable.Body>
    </StudioTable>
  );
};
