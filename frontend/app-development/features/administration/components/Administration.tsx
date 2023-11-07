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
import { Center } from 'app-shared/components/Center';
import { News } from './News';

export const Administration = () => {
  const { org, app } = useStudioUrlParams();
  const {
    data: orgs = { orgs: {} },
    isPending: isPendingOrgs,
    isError: isOrgsError,
  } = useOrgListQuery({ hideDefaultError: true });

  const selectedOrg = orgs.orgs[org];
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
      <Center>
        <AltinnSpinner spinnerText={t('general.loading')} className={classes.spinner} />
      </Center>
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
            <div>
              <News />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
