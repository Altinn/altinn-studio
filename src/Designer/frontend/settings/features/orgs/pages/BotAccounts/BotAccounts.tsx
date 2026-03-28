import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioError, StudioHeading, StudioParagraph, StudioSpinner } from '@studio/components';
import { matchPath, useLocation } from 'react-router-dom';
import { useGetBotAccountsQuery } from './hooks/useGetBotAccountsQuery';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { BotAccountsList } from './components/BotAccountsList/BotAccountsList';
import classes from './BotAccounts.module.css';

export const BotAccounts = (): ReactElement => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const match = matchPath({ path: 'orgs/:org', caseSensitive: true, end: false }, pathname);
  const { org } = match?.params ?? {};

  const { data: botAccounts, isPending, isError } = useGetBotAccountsQuery(org!);
  const { data: orgs } = useOrgListQuery();
  const availableEnvironments = orgs?.[org!]?.environments ?? [];

  if (isPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('settings.orgs.bot_accounts.loading')} />;
  }

  if (isError) {
    return <StudioError>{t('settings.orgs.bot_accounts.error')}</StudioError>;
  }

  return (
    <div className={classes.container}>
      <StudioHeading level={2} data-size='md'>
        {t('settings.orgs.bot_accounts.page_heading')}
      </StudioHeading>
      <StudioParagraph data-size='md'>
        {t('settings.orgs.bot_accounts.page_description')}
      </StudioParagraph>
      <section className={classes.section}>
        <BotAccountsList
          org={org!}
          botAccounts={botAccounts ?? []}
          availableEnvironments={availableEnvironments}
        />
      </section>
    </div>
  );
};
