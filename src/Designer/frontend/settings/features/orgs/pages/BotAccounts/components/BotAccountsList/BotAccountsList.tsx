import React, { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioTable,
  StudioButton,
  StudioDeleteButton,
  StudioHeading,
  StudioParagraph,
} from '@studio/components';
import { ChevronDownIcon, ChevronUpIcon, StudioEditIcon } from '@studio/icons';
import type { BotAccount } from 'app-shared/types/BotAccount';
import { useCreateBotAccountMutation } from '../../hooks/useCreateBotAccountMutation';
import { useDeactivateBotAccountMutation } from '../../hooks/useDeactivateBotAccountMutation';
import { useUpdateBotAccountTeamsMutation } from '../../hooks/useUpdateBotAccountTeamsMutation';
import { BotAccountDialog } from '../BotAccountDialog/BotAccountDialog';
import type { BotAccountForm } from '../BotAccountDialog/BotAccountDialog';
import { BotAccountApiKeysList } from '../BotAccountApiKeysList/BotAccountApiKeysList';
import { AddButton } from '../AddButton/AddButton';
import { EnvironmentsCell } from '../../../ContactPoints/components/EnvironmentsCell/EnvironmentsCell';
import classes from './BotAccountsList.module.css';

const createEmptyForm = (): BotAccountForm => ({
  name: '',
  deployEnvironments: [],
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
  const [form, setForm] = useState<BotAccountForm>(createEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [expandedBotAccountId, setExpandedBotAccountId] = useState<string | null>(null);
  useEffect(() => {
    if (dialogKey > 0) dialogRef.current?.showModal();
  }, [dialogKey]);

  const { mutate: createBotAccount, isPending: isCreating } = useCreateBotAccountMutation(org);
  const { mutate: deactivateBotAccount } = useDeactivateBotAccountMutation(org);
  const { mutate: updateTeams, isPending: isUpdatingTeams } = useUpdateBotAccountTeamsMutation(
    org,
    editingId ?? '',
  );

  const isSaving = isCreating || isUpdatingTeams;

  const openAddDialog = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setDialogKey((k) => k + 1);
  };

  const openEditDialog = (botAccount: BotAccount) => {
    setForm({ name: botAccount.username, deployEnvironments: botAccount.deployEnvironments });
    setEditingId(botAccount.id);
    setDialogKey((k) => k + 1);
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleFieldChange = (field: keyof BotAccountForm, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (editingId) {
      updateTeams(form.deployEnvironments, { onSuccess: closeDialog });
    } else {
      createBotAccount(
        {
          name: form.name,
          deployEnvironments: form.deployEnvironments.length > 0 ? form.deployEnvironments : null,
        },
        { onSuccess: closeDialog },
      );
    }
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
              {t('settings.orgs.bot_accounts.col_created')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.bot_accounts.col_created_by')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.bot_accounts.col_environments')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell />
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {botAccounts
            .filter((b) => !b.deactivated)
            .toSorted((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
            .map((botAccount) => (
              <React.Fragment key={botAccount.id}>
                <StudioTable.Row>
                  <StudioTable.Cell>{botAccount.username}</StudioTable.Cell>
                  <StudioTable.Cell>
                    {new Date(botAccount.created).toLocaleDateString()}
                  </StudioTable.Cell>
                  <StudioTable.Cell>{botAccount.createdByUsername ?? '–'}</StudioTable.Cell>
                  <EnvironmentsCell
                    environments={botAccount.deployEnvironments.map((e) => e.toLocaleLowerCase())}
                  />
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
                    <StudioButton
                      variant='tertiary'
                      icon={<StudioEditIcon />}
                      onClick={() => openEditDialog(botAccount)}
                      aria-label={t('settings.orgs.bot_accounts.edit_aria_label', {
                        username: botAccount.username,
                      })}
                    />
                    <StudioDeleteButton
                      aria-label={t('settings.orgs.bot_accounts.delete')}
                      onDelete={() => deactivateBotAccount(botAccount.id)}
                      confirmMessage={t('settings.orgs.bot_accounts.delete_confirm')}
                    />
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
      <BotAccountDialog
        key={dialogKey}
        dialogRef={dialogRef}
        form={form}
        availableEnvironments={availableEnvironments}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        onClose={closeDialog}
        isEditing={editingId !== null}
        isSaving={isSaving}
      />
    </>
  );
};
