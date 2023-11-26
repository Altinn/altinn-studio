import React from 'react';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { useRepoStatusQuery, useUserQuery } from 'app-shared/hooks/queries';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { NotFoundPage } from 'app-shared/components/notFound';
import { PageSpinner } from 'app-shared/components';
import { Center } from 'app-shared/components/Center';
import { MergeConflictWarning } from '../features/simpleMerge/MergeConflictWarning';

/**
 * Displays the layout for the app development pages
 */
export const AppShell = (): React.ReactNode => {
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const { org, app } = match.params;

  const {
    data: repoStatus,
    isLoading: repoStatusLoading,
    error: repoStatusError,
  } = useRepoStatusQuery(org, app);

  const { data: user, isLoading: userLoading } = useUserQuery();

  if (repoStatusLoading || userLoading) {
    return (
      <Center style={{ height: '100vh' }}>
        <PageSpinner />
      </Center>
    );
  }

  const renderPages = () => {
    if (repoStatusError?.response?.status === ServerCodes.NotFound) {
      return <NotFoundPage />;
    }
    if (repoStatus?.hasMergeConflict) {
      return <MergeConflictWarning org={org} app={app} />;
    }
    return <Outlet />;
  };

  return (
    <>
      <PageHeader
        org={org}
        app={app}
        showSubMenu={!repoStatus?.hasMergeConflict}
        user={user}
        isRepoError={repoStatusError !== null}
      />
      {renderPages()}
    </>
  );
};
