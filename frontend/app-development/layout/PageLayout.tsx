import React from 'react';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { useRepoMetadataQuery, useRepoStatusQuery, useUserQuery } from 'app-shared/hooks/queries';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { MergeConflictWarning } from '../features/simpleMerge/MergeConflictWarning';
import { useOrgListQuery } from '../hooks/queries';
import { NotFoundPage } from './NotFoundPage';

/**
 * Displays the layout for the app development pages
 */
export const PageLayout = (): React.ReactNode => {
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const { org, app } = match.params;

  const { data: orgs, isPending: orgsPending } = useOrgListQuery();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const repoOwnerIsOrg = !orgsPending && Object.keys(orgs.orgs).includes(repository?.owner.login);

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
        repoOwnerIsOrg={repoOwnerIsOrg}
        isRepoError={repoStatusError !== null}
      />
      {renderPages()}
    </>
  );
};
