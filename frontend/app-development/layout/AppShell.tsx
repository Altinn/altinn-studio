import React from 'react';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { useRepoStatusQuery, useUserQuery } from 'app-shared/hooks/queries';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { NotFoundPage } from 'app-shared/components/notFound';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
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
    isPending: isRepoStatusPending,
    error: repoStatusError,
  } = useRepoStatusQuery(org, app);

  const { data: user, isPending: isUserPending } = useUserQuery();

  if (isRepoStatusPending || isUserPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner />
      </StudioCenter>
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
