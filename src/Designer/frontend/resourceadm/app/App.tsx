import React from 'react';
import classes from './App.module.css';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../hooks/queries';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { StudioCenter, StudioSpinner } from '@studio/components';
import { ErrorMessage } from '../components/ErrorMessage';

export const App = (): React.JSX.Element => {
  const { status: userStatus, isError: isUserError } = useUserQuery();
  const { status: organizationsStatus, isError: isOrganizationsError } = useOrganizationsQuery();

  const { t } = useTranslation();
  const queryStatus = mergeQueryStatuses(userStatus, organizationsStatus);

  switch (queryStatus) {
    case 'pending':
      return (
        <StudioCenter className={classes.root}>
          <StudioSpinner data-size='xl' aria-label={t('resourceadm.loading_app')} />
        </StudioCenter>
      );
    case 'error':
      return (
        <div>
          {isUserError && (
            <ErrorMessage
              title={t('resourceadm.dashboard_userdata_error_header')}
              message={t('resourceadm.dashboard_userdata_error_body')}
            />
          )}
          {isOrganizationsError && (
            <ErrorMessage
              title={t('resourceadm.dashboard_organizationdata_error_header')}
              message={t('resourceadm.dashboard_organizationdata_error_body')}
            />
          )}
        </div>
      );
    case 'success':
      return (
        <div className={classes.root}>
          <Outlet />
        </div>
      );
  }
};
