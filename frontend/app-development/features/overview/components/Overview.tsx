import React from 'react';
import classes from './Overview.module.css';
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
import { StudioPageSpinner } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { RepoOwnedByPersonInfo } from './RepoOwnedByPersonInfo';

export const Overview = () => {
  const { org, app } = useStudioUrlParams();
  const {
    data: orgs,
    isPending: isPendingOrgs,
    isError: isOrgsError,
  } = useOrgListQuery({ hideDefaultError: true });
  const { data: repository } = useRepoMetadataQuery(org, app);
  const selectedOrg = orgs?.orgs[org];
  const hasEnvironments = selectedOrg?.environments?.length > 0;

  const {
    data: appConfigData,
    isError: isAppConfigError,
    isPending: isPendingAppConfig,
  } = useAppConfigQuery(org, app, { hideDefaultError: true });
  const { t } = useTranslation();

  if (isAppConfigError || isOrgsError) {
    toast.error(t('overview.fetch_title_error_message'));
  }

  if (isPendingAppConfig || isPendingOrgs) {
    return (
      <StudioPageSpinner
        showSpinnerTitle
        spinnerTitle={t('overview.loading_page')}
        className={classes.spinner}
      />
    );
  }

  // If repo-owner is an organisation
  const repoOwnerIsOrg = orgs && Object.keys(orgs.orgs).includes(repository?.owner.login);

  return (
    <PageContainer>
      <main className={classes.container}>
        <header className={classes.header} role='generic'>
          {/* According to https://developer.mozilla.org/en-US/docs/Web/HTML/Element/header, the role of <header> should implicitly be "generic" when it is a descendant of <main>, but Testing Library still interprets it as "banner". */}
          <Heading level={1} size='xlarge'>
            {appConfigData?.serviceName || app}
          </Heading>
        </header>
        <div className={classes.panel}>
          <div className={classes.content}>
            <div className={classes.main}>
              <section className={classes.mainSection}>
                {repoOwnerIsOrg ? <AppEnvironments /> : <RepoOwnedByPersonInfo />}
              </section>
              {repoOwnerIsOrg && hasEnvironments && (
                <section className={classes.mainSection}>
                  <AppLogs />
                </section>
              )}
              <section className={classes.mainSection}>
                <Navigation />
              </section>
            </div>
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
      </main>
    </PageContainer>
  );
};
