import React from 'react';
import classes from './Administration.module.css';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Heading } from '@digdir/design-system-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Documentation } from './Documentation';
import { AppEnvironments } from './AppEnvironments';
import { AppLogs } from './AppLogs';

export const Administration = () => {
  const { org, app } = useStudioUrlParams();
  const { data: appConfigData, isError } = useAppConfigQuery(org, app, { hideDefaultError: true });
  const { t } = useTranslation();

  if (isError) {
    toast.error(t('administration.fetch_title_error_message'));
  }

  return (
    <div className={classes.administration}>
      <div className={classes.container}>
        <div className={classes.header}>
          <Heading size='xlarge'>{appConfigData?.serviceName || app}</Heading>
        </div>
        <div className={classes.content}>
          <main className={classes.main}>
            <AppEnvironments />
            <AppLogs />
            <hr className={classes.divider} />
            <div className={classes.placeholder} style={{ height: '300px' }}>
              {/* NAVIGATION PLACEHOLDER */}
            </div>
          </main>
          <aside className={classes.aside}>
            <Documentation />
            <hr className={classes.divider} />
            <div className={classes.placeholder}>{/* NEWS PLACEHOLDER */}</div>
          </aside>
        </div>
      </div>
    </div>
  );
};
