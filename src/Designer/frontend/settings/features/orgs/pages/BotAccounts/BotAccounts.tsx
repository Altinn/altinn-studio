import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioError, StudioHeading, StudioParagraph, StudioSpinner } from '@studio/components';
import { matchPath, useLocation } from 'react-router-dom';
import type { BotAccount } from 'app-shared/types/BotAccount';
import { useGetBotAccountsQuery } from './hooks/useGetBotAccountsQuery';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { BotAccountsList } from './components/BotAccountsList/BotAccountsList';
import { BotAccountDialog } from './components/BotAccountDialog/BotAccountDialog';
import type { BotAccountForm } from './components/BotAccountDialog/BotAccountDialog';
import { AddButton } from '../../../../components/AddButton/AddButton';
import classes from './BotAccounts.module.css';

type DialogState = { form: BotAccountForm; editingId: string | null } | null;

export const BotAccounts = (): ReactElement => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const match = matchPath({ path: 'orgs/:org', caseSensitive: true, end: false }, pathname);
  const { org } = match?.params ?? {};

  const { data: botAccounts, isPending, isError } = useGetBotAccountsQuery(org!);
  const { data: orgs } = useOrgListQuery();
  const availableEnvironments = orgs?.[org!]?.environments ?? [];

  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [newBotId, setNewBotId] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openAddDialog = () =>
    setDialogState({
      form: { name: '', deployEnvironments: availableEnvironments },
      editingId: null,
    });

  const openEditDialog = (botAccount: BotAccount) =>
    setDialogState({
      form: { name: botAccount.username, deployEnvironments: botAccount.deployEnvironments },
      editingId: botAccount.id,
    });

  const closeDialog = () => setDialogState(null);

  const toggleExpanded = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  if (isPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('settings.orgs.bot_accounts.loading')} />;
  }

  if (isError) {
    return <StudioError>{t('settings.orgs.bot_accounts.error')}</StudioError>;
  }

  return (
    <div className={classes.container}>
      <div className={classes.heading}>
        <StudioHeading level={2} data-size='md'>
          {t('settings.orgs.bot_accounts.page_heading')}
        </StudioHeading>
        <StudioParagraph data-size='md'>
          {t('settings.orgs.bot_accounts.page_description')}
        </StudioParagraph>
      </div>
      <div className={classes.content}>
        <BotAccountsList
          org={org!}
          botAccounts={botAccounts ?? []}
          onEdit={openEditDialog}
          highlightId={newBotId}
          expandedId={expandedId}
          onToggleExpanded={toggleExpanded}
        />
        <AddButton onClick={openAddDialog}>
          {t('settings.orgs.bot_accounts.add_bot_account')}
        </AddButton>
        {dialogState && (
          <BotAccountDialog
            org={org!}
            initialForm={dialogState.form}
            availableEnvironments={availableEnvironments}
            onClose={closeDialog}
            editingId={dialogState.editingId}
            onCreated={(id) => {
              setNewBotId(id);
              setExpandedId(id);
            }}
          />
        )}
      </div>
    </div>
  );
};
