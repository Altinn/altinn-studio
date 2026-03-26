import React, { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioTable,
  StudioDeleteButton,
  StudioHeading,
  StudioParagraph,
  StudioButton,
  StudioTag,
} from '@studio/components';
import { ChevronDownIcon, ChevronUpIcon } from '@studio/icons';
import type { BotAccount } from 'app-shared/types/BotAccount';
import { useCreateBotAccountMutation } from '../../hooks/useCreateBotAccountMutation';
import { useDeactivateBotAccountMutation } from '../../hooks/useDeactivateBotAccountMutation';
import { CreateBotAccountDialog } from '../CreateBotAccountDialog/CreateBotAccountDialog';
import type { CreateBotAccountForm } from '../CreateBotAccountDialog/CreateBotAccountDialog';
import { BotAccountApiKeysList } from '../BotAccountApiKeysList/BotAccountApiKeysList';
import { AddButton } from '../AddButton/AddButton';
import classes from './BotAccountsList.module.css';

const createEmptyForm = (availableEnvironments: string[]): CreateBotAccountForm => ({
  name: '',
  deployEnvironments: availableEnvironments,
});

type BotAccountsListProps = {
  org: string;
  botAccounts: BotAccount[];
  availableEnvironments: string[];
};

export const BotAccountsList = ({
  org,
  botAccounts,
  availableEnvironments,
}: BotAccountsListProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<CreateBotAccountForm>(createEmptyForm(availableEnvironments));
  const [expandedBotAccountId, setExpandedBotAccountId] = useState<string | null>(null);

  const { mutate: createBotAccount, isPending: isCreating } = useCreateBotAccountMutation(org);
  const { mutate: deactivateBotAccount } = useDeactivateBotAccountMutation(org);

  const openAddDialog = () => {
    setForm(createEmptyForm(availableEnvironments));
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleFieldChange = (field: keyof CreateBotAccountForm, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    createBotAccount(
      {
        name: form.name,
        deployEnvironments: form.deployEnvironments.length > 0 ? form.deployEnvironments : null,
      },
      { onSuccess: closeDialog },
    );
  };

  const toggleExpanded = (botAccountId: string) => {
    setExpandedBotAccountId((prev) => (prev === botAccountId ? null : botAccountId));
  };

  return (
    <>
      <StudioHeading level={3}>{t('settings.orgs.bot_accounts.list_heading')}</StudioHeading>
      <StudioParagraph>{t('settings.orgs.bot_accounts.list_description')}</StudioParagraph>
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell>
              {t('settings.orgs.bot_accounts.col_username')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.bot_accounts.col_status')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.bot_accounts.col_created')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.bot_accounts.col_created_by')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell />
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {botAccounts.map((botAccount) => (
            <React.Fragment key={botAccount.id}>
              <StudioTable.Row>
                <StudioTable.Cell>{botAccount.username}</StudioTable.Cell>
                <StudioTable.Cell>
                  {botAccount.deactivated ? (
                    <StudioTag data-color='neutral'>
                      {t('settings.orgs.bot_accounts.status_deactivated')}
                    </StudioTag>
                  ) : (
                    <StudioTag data-color='success'>
                      {t('settings.orgs.bot_accounts.status_active')}
                    </StudioTag>
                  )}
                </StudioTable.Cell>
                <StudioTable.Cell>
                  {new Date(botAccount.created).toLocaleDateString()}
                </StudioTable.Cell>
                <StudioTable.Cell>{botAccount.createdByUsername ?? '–'}</StudioTable.Cell>
                <StudioTable.Cell className={classes.actionsCell}>
                  <StudioButton
                    variant='tertiary'
                    icon={
                      expandedBotAccountId === botAccount.id ? (
                        <ChevronUpIcon />
                      ) : (
                        <ChevronDownIcon />
                      )
                    }
                    onClick={() => toggleExpanded(botAccount.id)}
                    aria-label={t('settings.orgs.bot_accounts.expand_aria_label', {
                      username: botAccount.username,
                    })}
                    aria-expanded={expandedBotAccountId === botAccount.id}
                  />
                  {!botAccount.deactivated && (
                    <StudioDeleteButton
                      onDelete={() => deactivateBotAccount(botAccount.id)}
                      confirmMessage={t('settings.orgs.bot_accounts.deactivate_confirm')}
                    >
                      {t('settings.orgs.bot_accounts.deactivate')}
                    </StudioDeleteButton>
                  )}
                </StudioTable.Cell>
              </StudioTable.Row>
              {expandedBotAccountId === botAccount.id && (
                <StudioTable.Row key={`${botAccount.id}-detail`}>
                  <StudioTable.Cell colSpan={5} className={classes.detailCell}>
                    <BotAccountApiKeysList org={org} botAccountId={botAccount.id} />
                  </StudioTable.Cell>
                </StudioTable.Row>
              )}
            </React.Fragment>
          ))}
        </StudioTable.Body>
      </StudioTable>
      <AddButton onClick={openAddDialog}>
        {t('settings.orgs.bot_accounts.add_bot_account')}
      </AddButton>
      <CreateBotAccountDialog
        dialogRef={dialogRef}
        form={form}
        availableEnvironments={availableEnvironments}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        onClose={closeDialog}
        isSaving={isCreating}
      />
    </>
  );
};
