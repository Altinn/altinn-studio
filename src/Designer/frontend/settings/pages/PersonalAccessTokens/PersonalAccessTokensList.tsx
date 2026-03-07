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
import { useUserPersonalAccessTokensQuery } from '../hooks/queries/useUserPersonalAccessTokensQuery';
import { useDeleteUserPersonalAccessTokenMutation } from '../hooks/mutations/useDeleteUserPersonalAccessTokenMutation';
import classes from './PersonalAccessTokensList.module.css';

type PersonalAccessTokensListProps = {
  newTokenId: number | null;
};

export const PersonalAccessTokensList = ({
  newTokenId,
}: PersonalAccessTokensListProps): React.ReactElement => {
  const { t } = useTranslation();

  const {
    data: tokens,
    isPending,
    isError,
  } = useUserPersonalAccessTokensQuery({
    hideDefaultError: true,
  });
  const {
    mutate: deleteUserPersonalAccessToken,
    isPending: pendingDeletePersonalAccessToken,
    variables: deletingPersonalAccessTokenId,
  } = useDeleteUserPersonalAccessTokenMutation();

  const sortedTokens = useMemo(
    () => [...(tokens ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tokens],
  );

  if (isPending) {
    return (
      <StudioSpinner aria-hidden spinnerTitle={t('user.settings.personal_access_tokens.loading')} />
    );
  }

  if (isError) {
    return <StudioError>{t('user.settings.personal_access_tokens.error')}</StudioError>;
  }

  if (tokens.length === 0) {
    return <StudioParagraph>{t('user.settings.personal_access_tokens.no_tokens')}</StudioParagraph>;
  }

  const now = new Date();

  return (
    <StudioTable>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.HeaderCell>
            {t('user.settings.personal_access_tokens.name')}
          </StudioTable.HeaderCell>
          <StudioTable.HeaderCell>
            {t('user.settings.personal_access_tokens.expires_at')}
          </StudioTable.HeaderCell>
          <StudioTable.HeaderCell>
            {t('user.settings.personal_access_tokens.created_at')}
          </StudioTable.HeaderCell>
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
                  {t('user.settings.personal_access_tokens.expired')}
                </StudioTag>
              )}
            </StudioTable.Cell>
            <StudioTable.Cell className={classes.dateCell}>
              {new Date(token.createdAt).toLocaleDateString()}
            </StudioTable.Cell>
            <StudioTable.Cell className={classes.deleteCell}>
              <StudioDeleteButton
                onDelete={() => deleteUserPersonalAccessToken(token.id)}
                confirmMessage={t('user.settings.personal_access_tokens.delete_confirm')}
                disabled={
                  pendingDeletePersonalAccessToken && deletingPersonalAccessTokenId === token.id
                }
              >
                {t('user.settings.personal_access_tokens.delete')}
              </StudioDeleteButton>
            </StudioTable.Cell>
          </StudioTable.Row>
        ))}
      </StudioTable.Body>
    </StudioTable>
  );
};
