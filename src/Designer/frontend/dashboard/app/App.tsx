import React from 'react';
import classes from './App.module.css';
import { StudioPageError, StudioPageSpinner } from '@studio/components';
import { Outlet } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../hooks/queries';
import { useTranslation } from 'react-i18next';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import type { QueryStatus } from '@tanstack/react-query';

export function App(): React.ReactElement {
  const { status: userStatus } = useUserQuery();
  const { status: organizationsStatus } = useOrganizationsQuery();

  const queryStatus = mergeQueryStatuses(userStatus, organizationsStatus);

  switch (queryStatus) {
    case 'pending':
      return <PendingPage />;
    case 'error':
      return <ErrorMessage userStatus={userStatus} />;
    case 'success':
      return (
        <div className={classes.root}>
          <Outlet />
        </div>
      );
  }
}

function PendingPage(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.appDashboardSpinner}>
      <StudioPageSpinner spinnerTitle={t('dashboard.loading')} />
    </div>
  );
}

type ErrorMessageProps = {
  userStatus: QueryStatus;
};

function ErrorMessage({ userStatus }: ErrorMessageProps): React.ReactElement {
  const { t } = useTranslation();

  if (userStatus === 'error') {
    return (
      <StudioPageError
        title={t('dashboard.error_getting_user_data.title')}
        message={t('dashboard.error_getting_user_data.message')}
      />
    );
  } else {
    return (
      <StudioPageError
        title={t('dashboard.error_getting_organization_data.title')}
        message={t('dashboard.error_getting_organization_data.message')}
      />
    );
  }
}
