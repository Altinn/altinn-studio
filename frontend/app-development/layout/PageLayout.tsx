import React from 'react';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import {
  useAppVersionQuery,
  useRepoMetadataQuery,
  useRepoStatusQuery,
  useUserQuery,
} from 'app-shared/hooks/queries';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { StudioCenter, StudioPageSpinner } from '@studio/components-legacy';
import { MergeConflictWarning } from 'app-shared/components/MergeConflictWarning';
import { useOrgListQuery } from '../hooks/queries';
import { NotFoundPage } from './NotFoundPage';
import { useTranslation } from 'react-i18next';
import { WebSocketSyncWrapper } from '../components';
import { PageHeaderContextProvider } from 'app-development/contexts/PageHeaderContext';
import { type AxiosError } from 'axios';
import { type RepoStatus } from 'app-shared/types/RepoStatus';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  MINIMUM_SUPPORTED_BACKEND_VERSION,
  MINIMUM_SUPPORTED_FRONTEND_VERSION,
} from 'app-shared/constants';
import { OutdatedVersionAlert } from './VersionAlerts/OutdatedVersionAlert';
import { UnsupportedVersionAlert } from './VersionAlerts/UnsupportedVersionAlert';
import { isBelowSupportedVersion } from './VersionAlerts/utils';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useNavigateFrom } from './PageHeader/SubHeader/SettingsModalButton/useNavigateFrom';

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

  if (isRepoStatusPending || isUserPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  return (
    <>
      <PageHeaderContextProvider user={user} repoOwnerIsOrg={repoOwnerIsOrg}>
        <PageHeader
          showSubMenu={!repoStatus?.hasMergeConflict}
          isRepoError={repoStatusError !== null}
        />
      </PageHeaderContextProvider>
      <Pages repoStatus={repoStatus} repoStatusError={repoStatusError} />
    </>
  );
};

type PagesToRenderProps = {
  repoStatusError: AxiosError;
  repoStatus: RepoStatus;
};
const Pages = ({ repoStatusError, repoStatus }: PagesToRenderProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);

  const { currentRoutePath } = useNavigateFrom();

  if (repoStatusError?.response?.status === ServerCodes.NotFound) {
    return <NotFoundPage />;
  }
  if (repoStatus?.hasMergeConflict) {
    return <MergeConflictWarning owner={org} repoName={app} />;
  }

  const isFrontendUnsupported = isBelowSupportedVersion(
    data?.frontendVersion,
    MINIMUM_SUPPORTED_FRONTEND_VERSION,
  );
  const isBackendUnsupported = isBelowSupportedVersion(
    data?.backendVersion,
    MINIMUM_SUPPORTED_BACKEND_VERSION,
  );

  if (currentRoutePath !== RoutePaths.Deploy && (isFrontendUnsupported || isBackendUnsupported)) {
    return <UnsupportedVersionAlert />;
  }

  return (
    <>
      <OutdatedVersionAlert />
      <WebSocketSyncWrapper>
        <Outlet />
      </WebSocketSyncWrapper>
    </>
  );
};
