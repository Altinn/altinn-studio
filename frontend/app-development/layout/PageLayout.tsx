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
import { StudioCenter, StudioPageError, StudioPageSpinner } from '@studio/components-legacy';
import { StudioAlert, StudioDialog, StudioHeading, StudioLink } from '@studio/components';
import { MergeConflictWarning } from 'app-shared/components/MergeConflictWarning';
import { useOrgListQuery } from '../hooks/queries';
import { NotFoundPage } from './NotFoundPage';
import { useTranslation } from 'react-i18next';
import { WebSocketSyncWrapper } from '../components';
import { PageHeaderContextProvider } from 'app-development/contexts/PageHeaderContext';
import { useOpenSettingsModalBasedQueryParam } from '../hooks/useOpenSettingsModalBasedQueryParam';
import { type AxiosError } from 'axios';
import { type RepoStatus } from 'app-shared/types/RepoStatus';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { MINIMUM_FRONTEND_VERSION, LATEST_FRONTEND_VERSION } from 'app-shared/constants';
import classes from './PageLayout.module.css';

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
  // Listen to URL-search params and opens settings-modal if params matches.
  useOpenSettingsModalBasedQueryParam();
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);
  const { t } = useTranslation();

  if (repoStatusError?.response?.status === ServerCodes.NotFound) {
    return <NotFoundPage />;
  }
  if (repoStatus?.hasMergeConflict) {
    return <MergeConflictWarning owner={org} repoName={app} />;
  }

  if (data?.frontendVersion?.slice(0, MINIMUM_FRONTEND_VERSION.length) < MINIMUM_FRONTEND_VERSION) {
    return (
      <StudioPageError title='Unsupported version' message={t('general.unsupported_old_version')} />
    );
  }

  return (
    <>
      {data?.frontendVersion?.slice(0, LATEST_FRONTEND_VERSION.length) <
        LATEST_FRONTEND_VERSION && (
        <div>
          <StudioDialog data-color='warning' open className={classes.dialog}>
            <StudioDialog.Block className={classes.text}>
              <StudioAlert data-color='warning' className={classes.alert}>
                <StudioHeading>Migrering</StudioHeading>
                {t('general.supported_old_version')}
                <table>
                  <tr>
                    <th align='left'>Current version:</th>
                    <td>{data.frontendVersion}</td>
                  </tr>
                  <tr>
                    <th align='left'>Latest version:</th>
                    <td>{LATEST_FRONTEND_VERSION}</td>
                  </tr>
                </table>
              </StudioAlert>
            </StudioDialog.Block>
            <StudioDialog.Block className={classes.buttons}>
              <StudioLink
                className={classes.linkButton}
                href='https://docs.altinn.studio/nb/community/changelog/app-frontend/v4/migrating-from-v3/'
              >
                Migrere frontend til v4
              </StudioLink>
              <StudioLink
                className={classes.linkButton}
                href='https://docs.altinn.studio/nb/community/changelog/app-nuget/v8/migrating-from-v7/'
              >
                Migrere backend til v8
              </StudioLink>
            </StudioDialog.Block>
          </StudioDialog>
        </div>
      )}
      <WebSocketSyncWrapper>
        <Outlet />
      </WebSocketSyncWrapper>
    </>
  );
};
