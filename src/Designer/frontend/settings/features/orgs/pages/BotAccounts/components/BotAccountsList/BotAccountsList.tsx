import React, { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTable, StudioButton, StudioDeleteButton, StudioTag } from '@studio/components';
import { ChevronDownIcon, ChevronRightIcon, StudioEditIcon } from '@studio/icons';
import type { BotAccount } from 'app-shared/types/BotAccount';
import { useDeactivateBotAccountMutation } from '../../hooks/useDeactivateBotAccountMutation';
import { useGetBotAccountApiKeysQuery } from '../../hooks/useGetBotAccountApiKeysQuery';
import { BotAccountApiKeys } from '../BotAccountApiKeys/BotAccountApiKeys';
import { EnvironmentsCell } from '../../../../../../components/EnvironmentsCell/EnvironmentsCell';
import classes from './BotAccountsList.module.css';

const isInteractiveElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'button, a, input, select, textarea, [role="button"], [role="link"], [data-row-toggle-ignore="true"]',
    ),
  );
};

type BotAccountsListProps = {
  org: string;
  botAccounts: BotAccount[];
  onEdit: (botAccount: BotAccount) => void;
  highlightId?: string;
};

type ApiKeysPreviewCellProps = {
  org: string;
  botAccountId: string;
};

const ApiKeysPreviewCell = ({ org, botAccountId }: ApiKeysPreviewCellProps): ReactElement => {
  const { t } = useTranslation();
  const { data: apiKeys, isPending, isError } = useGetBotAccountApiKeysQuery(org, botAccountId);

  if (isPending) {
    return <span className={classes.apiKeysPlaceholder}>...</span>;
  }

  if (isError) {
    return <span className={classes.apiKeysPlaceholder}>-</span>;
  }

  if (apiKeys?.length === 0) {
    return (
      <StudioTag data-color='warning'>{t('settings.orgs.bot_accounts.no_api_keys')}</StudioTag>
    );
  }

  return (
    <StudioTag data-color='info'>
      {t('settings.orgs.bot_accounts.api_keys_count', { count: apiKeys?.length })}
    </StudioTag>
  );
};

export const BotAccountsList = ({
  org,
  botAccounts,
  onEdit,
  highlightId,
}: BotAccountsListProps): ReactElement => {
  const { t } = useTranslation();
  const [expandedBotAccountId, setExpandedBotAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightId || expandedBotAccountId === highlightId) {
      return;
    }

    if (botAccounts.some((botAccount) => botAccount.id === highlightId)) {
      setExpandedBotAccountId(highlightId);
    }
  }, [highlightId, botAccounts, expandedBotAccountId]);

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
          <StudioTable.HeaderCell />
          <StudioTable.HeaderCell>
            {t('settings.orgs.bot_accounts.col_username')}
          </StudioTable.HeaderCell>
          <StudioTable.HeaderCell>
            {t('settings.orgs.bot_accounts.col_environments')}
          </StudioTable.HeaderCell>
          <StudioTable.HeaderCell>
            {t('settings.orgs.bot_accounts.col_api_keys')}
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
        {sortedBotAccounts.map((botAccount) => {
          const detailsPanelId = `bot-account-api-keys-${botAccount.id}`;
          const isExpanded = expandedBotAccountId === botAccount.id;

          return (
            <React.Fragment key={botAccount.id}>
              <StudioTable.Row
                className={`${classes.expandableRow} ${botAccount.id === highlightId ? classes.newRow : ''}`}
                onClick={(event) => {
                  if (isInteractiveElement(event.target)) {
                    return;
                  }

                  toggleExpanded(botAccount.id);
                }}
              >
                <StudioTable.Cell>
                  <StudioButton
                    variant='tertiary'
                    aria-expanded={isExpanded}
                    aria-controls={detailsPanelId}
                    aria-label={t(
                      isExpanded
                        ? 'settings.orgs.bot_accounts.collapse_aria_label'
                        : 'settings.orgs.bot_accounts.expand_aria_label',
                      {
                        username: botAccount.username,
                      },
                    )}
                    icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    onClick={() => toggleExpanded(botAccount.id)}
                  />
                </StudioTable.Cell>
                <StudioTable.Cell className={classes.usernameCell}>
                  <span className={classes.username}>{botAccount.username}</span>
                </StudioTable.Cell>
                <EnvironmentsCell
                  environments={botAccount.deployEnvironments.map((e) => e.toLocaleLowerCase())}
                />
                <StudioTable.Cell>
                  <ApiKeysPreviewCell org={org} botAccountId={botAccount.id} />
                </StudioTable.Cell>
                <StudioTable.Cell>
                  {new Date(botAccount.created).toLocaleDateString()}
                </StudioTable.Cell>
                <StudioTable.Cell>{botAccount.createdByUsername ?? '–'}</StudioTable.Cell>
                <StudioTable.Cell className={classes.actionsCell}>
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
              {isExpanded && (
                <StudioTable.Row key={`${botAccount.id}-detail`}>
                  <StudioTable.Cell id={detailsPanelId} colSpan={7} className={classes.detailsCell}>
                    <BotAccountApiKeys org={org} botAccountId={botAccount.id} />
                  </StudioTable.Cell>
                </StudioTable.Row>
              )}
            </React.Fragment>
          );
        })}
      </StudioTable.Body>
    </StudioTable>
  );
};
