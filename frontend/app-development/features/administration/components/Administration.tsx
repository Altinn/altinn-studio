import React from 'react';
import classes from './Administration.module.css';
import { useAppConfigQuery, useOrgListQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Heading, Link } from '@digdir/design-system-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Documentation } from './Documentation';
import { AppEnvironments } from './AppEnvironments';
import { AppLogs } from './AppLogs';
import { Navigation } from './Navigation';
import { News } from './News';
import { PageContainer } from 'app-shared/components/PageContainer/PageContainer';
import { StudioCenter, StudioSpinner } from '@studio/components';

export const Administration = () => {
  const { org, app } = useStudioUrlParams();
  const {
    data: orgs,
    isPending: isPendingOrgs,
    isError: isOrgsError,
  } = useOrgListQuery({ hideDefaultError: true });

  const selectedOrg = orgs?.orgs[org];
  const hasEnvironments = selectedOrg?.environments?.length > 0;

  const {
    data: appConfigData,
    isError: isAppConfigError,
    isPending: isPendingAppConfig,
  } = useAppConfigQuery(org, app, { hideDefaultError: true });
  const { t } = useTranslation();

  if (isAppConfigError || isOrgsError) {
    toast.error(t('administration.fetch_title_error_message'));
  }

  if (isPendingAppConfig || isPendingOrgs) {
    return (
      <StudioCenter>
        <StudioSpinner spinnerText={t('general.loading')} className={classes.spinner} />
      </StudioCenter>
    );
  }

  return (
    <PageContainer>
      <div className={classes.container}>
        <header className={classes.header}>
          <Heading size='xlarge'>{appConfigData?.serviceName || app}</Heading>
        </header>
        <div className={classes.panel}>
          <div className={classes.content}>
            <main className={classes.main}>
              <section className={classes.mainSection}>
                <AppEnvironments />
              </section>
              {hasEnvironments && (
                <section className={classes.mainSection}>
                  <AppLogs />
                </section>
              )}
              <section className={classes.mainSection}>
                <Navigation />
              </section>
            </main>
            <aside className={classes.aside}>
              <section className={classes.asideSection}>
                <Documentation />
              </section>
              <section>
                <News />
              </section>
            </aside>
          </div>
          <footer className={classes.footer}>
            <Link href='/contact'>{t('general.contact')}</Link>
          </footer>
        </div>
      </div>
    </PageContainer>
  );
};
