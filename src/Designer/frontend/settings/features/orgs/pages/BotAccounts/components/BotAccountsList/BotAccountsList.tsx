import React, { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTable, StudioButton, StudioDeleteButton } from '@studio/components';
import { ChevronDownIcon, ChevronUpIcon, StudioEditIcon } from '@studio/icons';
import type { BotAccount } from 'app-shared/types/BotAccount';
import { useDeactivateBotAccountMutation } from '../../hooks/useDeactivateBotAccountMutation';
import { BotAccountApiKeys } from '../BotAccountApiKeys/BotAccountApiKeys';
import { EnvironmentsCell } from '../../../ContactPoints/components/EnvironmentsCell/EnvironmentsCell';
import classes from './BotAccountsList.module.css';

type BotAccountsListProps = {
  org: string;
  botAccounts: BotAccount[];
  onEdit: (botAccount: BotAccount) => void;
  highlightId?: string;
};

export const BotAccountsList = ({
  org,
  botAccounts,
  onEdit,
  highlightId,
}: BotAccountsListProps): ReactElement => {
  const { t } = useTranslation();
  const [expandedBotAccountId, setExpandedBotAccountId] = useState<string | null>(null);

  const { mutate: deactivateBotAccount } = useDeactivateBotAccountMutation(org);

  const toggleExpanded = (botAccountId: string) => {
    setExpandedBotAccountId((prev) => (prev === botAccountId ? null : botAccountId));
  };

  const sortedBotAccounts = useMemo(
    () =>
      botAccounts.toSorted((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()),
    [botAccounts],
  );

  return (
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
        {sortedBotAccounts.map((botAccount) => (
          <React.Fragment key={botAccount.id}>
            <StudioTable.Row className={botAccount.id === highlightId ? classes.newRow : undefined}>
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
                    expandedBotAccountId === botAccount.id ? <ChevronUpIcon /> : <ChevronDownIcon />
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
                  onClick={() => onEdit(botAccount)}
                  aria-label={t('settings.orgs.bot_accounts.edit_aria_label', {
                    username: botAccount.username,
                  })}
                />
                <StudioDeleteButton
                  aria-label={t('settings.orgs.bot_accounts.delete', {
                    username: botAccount.username,
                  })}
                  onDelete={() => deactivateBotAccount(botAccount.id)}
                  confirmMessage={t('settings.orgs.bot_accounts.delete_confirm')}
                />
              </StudioTable.Cell>
            </StudioTable.Row>
            {expandedBotAccountId === botAccount.id && (
              <StudioTable.Row key={`${botAccount.id}-detail`}>
                <StudioTable.Cell colSpan={5} className={classes.detailCell}>
                  <BotAccountApiKeys org={org} botAccountId={botAccount.id} />
                </StudioTable.Cell>
              </StudioTable.Row>
            )}
          </React.Fragment>
        ))}
      </StudioTable.Body>
    </StudioTable>
  );
};
