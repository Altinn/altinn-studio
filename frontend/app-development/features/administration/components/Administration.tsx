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
            <div className={classes.mainBlock}>
              <AppEnvironments />
            </div>
            <div className={classes.mainBlock}>
              <AppLogs />
            </div>
            <div className={classes.mainBlock} style={{ height: '300px' }}>
              {/* NAVIGATION PLACEHOLDER */}
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
