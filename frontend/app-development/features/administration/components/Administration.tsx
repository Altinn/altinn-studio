import React from 'react';
import classes from './Administration.module.css';
import { useAppConfigQuery, useOrgListQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Heading } from '@digdir/design-system-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Documentation } from './Documentation';
import { AppEnvironments } from './AppEnvironments';
import { AppLogs } from './AppLogs';
import { Navigation } from './Navigation';
import { AltinnSpinner } from 'app-shared/components';

export const Administration = () => {
  const { org, app } = useStudioUrlParams();
  const {
    data: orgs = { orgs: {} },
    isLoading: isLoadingOrgs,
    isError: isOrgsError,
  } = useOrgListQuery({ hideDefaultError: true });

  const selectedOrg = orgs.orgs[org];
  const hasEnvironments = selectedOrg?.environments?.length > 0;

  const {
    data: appConfigData,
    isError: isAppConfigError,
    isLoading: isLoadingAppConfig,
  } = useAppConfigQuery(org, app, { hideDefaultError: true });
  const { t } = useTranslation();

  if (isAppConfigError || isOrgsError) {
    toast.error(t('administration.fetch_title_error_message'));
  }

  if (isLoadingAppConfig || isLoadingOrgs) {
    return (
      <div className={classes.spinnerContainer}>
        <AltinnSpinner spinnerText={t('general.loading')} className={classes.spinner} />
      </div>
    );
  }

  return (
    <div className={classes.pageContainer}>
      <div className={classes.container}>
        <div className={classes.header}>
          <Heading size='xlarge'>{appConfigData?.serviceName || app}</Heading>
        </div>
        <div className={classes.content}>
          <main className={classes.main}>
            <div className={classes.mainBlock}>
              <AppEnvironments />
            </div>
            {hasEnvironments && (
              <div className={classes.mainBlock}>
                <AppLogs />
              </div>
            )}
            <div className={classes.mainBlock}>
              <Navigation />
            </div>
          </main>
          <aside className={classes.aside}>
            <div className={classes.asideBlock}>
              <Documentation />
            </div>
            <hr className={classes.divider} />
            <div className={classes.asideBlock} style={{ height: '500px' }}>
              {/* NEWS PLACEHOLDER */}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
