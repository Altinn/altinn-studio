import React, { useEffect } from 'react';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { useRepoMetadataQuery, useRepoStatusQuery, useUserQuery } from 'app-shared/hooks/queries';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { MergeConflictWarning } from '../features/simpleMerge/MergeConflictWarning';
import { useOrgListQuery } from '../hooks/queries';
import { NotFoundPage } from './NotFoundPage';
import { useTranslation } from 'react-i18next';
import { WebSocketSyncWrapper } from '../components';
import postMessages from 'app-shared/utils/postMessages';
import classes from './PageLayout.module.css';
import { appContentWrapperId } from '@studio/testing/testids';

/**
 * Displays the layout for the app development pages
 */
export const PageLayout = (): React.ReactNode => {
  const { t } = useTranslation();

  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const { org, app } = match.params;

  const { data: orgs, isPending: orgsPending } = useOrgListQuery();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const repoOwnerIsOrg = !orgsPending && Object.keys(orgs).includes(repository?.owner?.login);

  const {
    data: repoStatus,
    isPending: isRepoStatusPending,
    error: repoStatusError,
  } = useRepoStatusQuery(org, app);

  const { data: user, isPending: isUserPending } = useUserQuery();

  const { refetch: reFetchRepoStatus } = useRepoStatusQuery(org, app);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const windowEventReceived = async (event: any) => {
      if (event.data === postMessages.forceRepoStatusCheck) {
        await reFetchRepoStatus();
      }
    };

    window.addEventListener('message', windowEventReceived);
    return function cleanup() {
      window.removeEventListener('message', windowEventReceived);
    };
  }, [reFetchRepoStatus]);

  if (isRepoStatusPending || isUserPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner showSpinnerTitle={false} spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  const renderPages = () => {
    if (repoStatusError?.response?.status === ServerCodes.NotFound) {
      return <NotFoundPage />;
    }
    if (repoStatus?.hasMergeConflict) {
      return <MergeConflictWarning />;
    }
    return (
      <WebSocketSyncWrapper>
        <Outlet />
      </WebSocketSyncWrapper>
    );
  };

  return (
    <div className={classes.container}>
      <div data-testid={appContentWrapperId}>
        <PageHeader
          showSubMenu={!repoStatus?.hasMergeConflict}
          user={user}
          repoOwnerIsOrg={repoOwnerIsOrg}
          isRepoError={repoStatusError !== null}
        />
        {renderPages()}
      </div>
    </div>
  );
};
