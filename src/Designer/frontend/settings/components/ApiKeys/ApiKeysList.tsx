import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DateUtils } from '@studio/pure-functions';
import {
  StudioDeleteButton,
  StudioError,
  StudioSpinner,
  StudioTable,
  StudioTag,
} from '@studio/components';
import classes from './ApiKeysList.module.css';

export type ApiKey = {
  id: number;
  name: string;
  expiresAt: string;
  createdAt: string;
  createdByUsername?: string | null;
};

type ApiKeysListProps = {
  apiKeys: ApiKey[] | undefined;
  isPending: boolean;
  isError: boolean;
  onDelete: (id: number) => void;
  deletingId?: number;
  highlightId?: number;
  showCreatedBy?: boolean;
};

export const ApiKeysList = ({
  apiKeys,
  isPending,
  isError,
  onDelete,
  deletingId,
  highlightId,
  showCreatedBy = false,
}: ApiKeysListProps): ReactElement => {
  const { t } = useTranslation();
  const now = new Date();

  const sortedApiKeys = useMemo(
    () =>
      [...(apiKeys ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [apiKeys],
  );

  if (isPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('settings.api_keys.loading')} />;
  }

  if (isError) {
    return <StudioError>{t('settings.api_keys.load_error')}</StudioError>;
  }

  return (
    <StudioTable>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.HeaderCell className={classes.nameCell}>
            {t('settings.api_keys.col_name')}
          </StudioTable.HeaderCell>
          <StudioTable.HeaderCell className={classes.narrowCell}>
            {t('settings.api_keys.col_expires_at')}
          </StudioTable.HeaderCell>
          <StudioTable.HeaderCell className={classes.narrowCell}>
            {t('settings.api_keys.col_created_at')}
          </StudioTable.HeaderCell>
          {showCreatedBy && (
            <StudioTable.HeaderCell className={classes.narrowCell}>
              {t('settings.api_keys.col_created_by')}
            </StudioTable.HeaderCell>
          )}
          <StudioTable.HeaderCell className={classes.deleteCell} />
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        {sortedApiKeys.map((apiKey) => (
          <StudioTable.Row
            key={apiKey.id}
            className={apiKey.id === highlightId ? classes.newRow : undefined}
          >
            <StudioTable.Cell className={classes.nameCell}>{apiKey.name}</StudioTable.Cell>
            <StudioTable.Cell className={classes.narrowCell}>
              {DateUtils.formatDateDDMMYYYY(apiKey.expiresAt)}
              {new Date(apiKey.expiresAt) < now && (
                <StudioTag data-color='danger' className={classes.expiredTag}>
                  {t('settings.api_keys.expired')}
                </StudioTag>
              )}
            </StudioTable.Cell>
            <StudioTable.Cell className={classes.narrowCell}>
              {DateUtils.formatDateDDMMYYYY(apiKey.createdAt)}
            </StudioTable.Cell>
            {showCreatedBy && (
              <StudioTable.Cell className={classes.narrowCell}>
                {apiKey.createdByUsername ?? '–'}
              </StudioTable.Cell>
            )}
            <StudioTable.Cell className={classes.deleteCell}>
              <StudioDeleteButton
                aria-label={t('settings.api_keys.delete', { name: apiKey.name })}
                onDelete={() => onDelete(apiKey.id)}
                confirmMessage={t('settings.api_keys.delete_confirm')}
                disabled={deletingId === apiKey.id}
              />
            </StudioTable.Cell>
          </StudioTable.Row>
        ))}
      </StudioTable.Body>
    </StudioTable>
  );
};
