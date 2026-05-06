import React, { useMemo } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { DateUtils } from '@studio/pure-functions';
import { StudioTable, StudioButton, StudioDeleteButton, StudioTag } from '@studio/components';
import { ChevronDownIcon, ChevronRightIcon, StudioEditIcon } from '@studio/icons';
import type { BotAccount } from 'app-shared/types/BotAccount';
import { useDeactivateBotAccountMutation } from '../../hooks/useDeactivateBotAccountMutation';
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
  expandedId: string | null;
  onToggleExpanded: (id: string) => void;
};

type ApiKeysPreviewCellProps = {
  apiKeyCount: number;
};

const ApiKeysPreviewCell = ({ apiKeyCount }: ApiKeysPreviewCellProps): ReactElement => {
  const { t } = useTranslation();

  if (apiKeyCount === 0) {
    return (
      <StudioTag data-color='warning'>{t('settings.orgs.bot_accounts.no_api_keys')}</StudioTag>
    );
  }

  return (
    <StudioTag data-color='info'>
      {t('settings.orgs.bot_accounts.api_keys_count', { count: apiKeyCount })}
    </StudioTag>
  );
};

export const BotAccountsList = ({
  org,
  botAccounts,
  onEdit,
  highlightId,
  expandedId,
  onToggleExpanded,
}: BotAccountsListProps): ReactElement => {
  const { t } = useTranslation();

  const { mutate: deactivateBotAccount } = useDeactivateBotAccountMutation(org);

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
          const isExpanded = expandedId === botAccount.id;

          return (
            <React.Fragment key={botAccount.id}>
              <StudioTable.Row
                className={`${classes.expandableRow} ${botAccount.id === highlightId ? classes.newRow : ''}`}
                onClick={(event) => {
                  if (isInteractiveElement(event.target)) {
                    return;
                  }

                  onToggleExpanded(botAccount.id);
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
                    onClick={() => onToggleExpanded(botAccount.id)}
                  />
                </StudioTable.Cell>
                <StudioTable.Cell>
                  <span className={classes.username}>{botAccount.username}</span>
                </StudioTable.Cell>
                <EnvironmentsCell
                  environments={botAccount.deployEnvironments.map((e) => e.toLocaleLowerCase())}
                />
                <StudioTable.Cell>
                  <ApiKeysPreviewCell apiKeyCount={botAccount.apiKeyCount} />
                </StudioTable.Cell>
                <StudioTable.Cell>
                  {DateUtils.formatDateDDMMYYYY(botAccount.created)}
                </StudioTable.Cell>
                <StudioTable.Cell>{botAccount.createdByUsername ?? '–'}</StudioTable.Cell>
                <StudioTable.Cell>
                  <div className={classes.actions}>
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
                  </div>
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
