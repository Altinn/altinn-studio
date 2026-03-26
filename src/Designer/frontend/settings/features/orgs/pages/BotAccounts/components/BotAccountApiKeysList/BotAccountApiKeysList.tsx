import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioTable,
  StudioDeleteButton,
  StudioHeading,
  StudioSpinner,
  StudioError,
  StudioParagraph,
  StudioTag,
} from '@studio/components';
import { useGetBotAccountApiKeysQuery } from '../../hooks/useGetBotAccountApiKeysQuery';
import { useCreateBotAccountApiKeyMutation } from '../../hooks/useCreateBotAccountApiKeyMutation';
import { useRevokeBotAccountApiKeyMutation } from '../../hooks/useRevokeBotAccountApiKeyMutation';
import { CreateApiKeyDialog, computeMaxExpiresAt } from '../CreateApiKeyDialog/CreateApiKeyDialog';
import type { CreateApiKeyForm } from '../CreateApiKeyDialog/CreateApiKeyDialog';
import { AddButton } from '../AddButton/AddButton';
import classes from './BotAccountApiKeysList.module.css';

const createEmptyForm = (): CreateApiKeyForm => ({
  name: '',
  expiresAt: computeMaxExpiresAt(),
});

type BotAccountApiKeysListProps = {
  org: string;
  botAccountId: string;
};

export const BotAccountApiKeysList = ({
  org,
  botAccountId,
}: BotAccountApiKeysListProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<CreateApiKeyForm>(createEmptyForm());
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data: apiKeys, isPending, isError } = useGetBotAccountApiKeysQuery(org, botAccountId);
  const { mutate: createApiKey, isPending: isCreating } = useCreateBotAccountApiKeyMutation(
    org,
    botAccountId,
  );
  const {
    mutate: revokeApiKey,
    isPending: isRevoking,
    variables: revokingKeyId,
  } = useRevokeBotAccountApiKeyMutation(org, botAccountId);

  const openDialog = () => {
    setForm(createEmptyForm());
    setNewApiKey(null);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleFieldChange = (field: keyof CreateApiKeyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    createApiKey(
      { name: form.name, expiresAt: `${form.expiresAt}T23:59:59Z` },
      {
        onSuccess: (response) => {
          setNewApiKey(response.key);
        },
      },
    );
  };

  const now = new Date();

  if (isPending) {
    return (
      <StudioSpinner aria-hidden spinnerTitle={t('settings.orgs.bot_accounts.api_keys_loading')} />
    );
  }

  if (isError) {
    return <StudioError>{t('settings.orgs.bot_accounts.api_keys_error')}</StudioError>;
  }

  return (
    <>
      <StudioHeading level={4} className={classes.heading}>
        {t('settings.orgs.bot_accounts.api_keys_heading')}
      </StudioHeading>
      {apiKeys && apiKeys.length > 0 ? (
        <StudioTable className={classes.table}>
          <StudioTable.Head>
            <StudioTable.Row>
              <StudioTable.HeaderCell>
                {t('settings.orgs.bot_accounts.col_api_key_name')}
              </StudioTable.HeaderCell>
              <StudioTable.HeaderCell>
                {t('settings.orgs.bot_accounts.col_api_key_expires_at')}
              </StudioTable.HeaderCell>
              <StudioTable.HeaderCell>
                {t('settings.orgs.bot_accounts.col_api_key_created_at')}
              </StudioTable.HeaderCell>
              <StudioTable.HeaderCell />
            </StudioTable.Row>
          </StudioTable.Head>
          <StudioTable.Body>
            {apiKeys.map((apiKey) => (
              <StudioTable.Row key={apiKey.id}>
                <StudioTable.Cell>{apiKey.name}</StudioTable.Cell>
                <StudioTable.Cell>
                  {new Date(apiKey.expiresAt).toLocaleDateString()}
                  {new Date(apiKey.expiresAt) < now && (
                    <StudioTag data-color='danger' className={classes.expiredTag}>
                      {t('settings.orgs.bot_accounts.api_key_expired')}
                    </StudioTag>
                  )}
                </StudioTable.Cell>
                <StudioTable.Cell>
                  {new Date(apiKey.createdAt).toLocaleDateString()}
                </StudioTable.Cell>
                <StudioTable.Cell>
                  <StudioDeleteButton
                    onDelete={() => revokeApiKey(apiKey.id)}
                    confirmMessage={t('settings.orgs.bot_accounts.api_key_revoke_confirm')}
                    disabled={isRevoking && revokingKeyId === apiKey.id}
                  >
                    {t('settings.orgs.bot_accounts.api_key_revoke')}
                  </StudioDeleteButton>
                </StudioTable.Cell>
              </StudioTable.Row>
            ))}
          </StudioTable.Body>
        </StudioTable>
      ) : (
        <StudioParagraph className={classes.noApiKeys}>
          {t('settings.orgs.bot_accounts.no_api_keys')}
        </StudioParagraph>
      )}
      <AddButton onClick={openDialog}>{t('settings.orgs.bot_accounts.add_api_key')}</AddButton>
      <CreateApiKeyDialog
        dialogRef={dialogRef}
        form={form}
        newApiKey={newApiKey}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        onClose={closeDialog}
        onDismissNewApiKey={() => setNewApiKey(null)}
        isSaving={isCreating}
      />
    </>
  );
};
