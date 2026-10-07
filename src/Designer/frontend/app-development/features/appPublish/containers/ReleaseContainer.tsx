import { useEffect, useState } from 'react';
import classes from './ReleaseContainer.module.css';
import type { AppRelease as AppReleaseType } from 'app-shared/types/AppRelease';
import type { KeyboardEvent, MouseEvent } from 'react';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';
import { CreateRelease } from '../components/CreateRelease';
import { Release } from '../components/Release';
import { UploadIcon, CheckmarkIcon } from '@studio/icons';
import { BuildSource } from '../components/BuildSource';
import { StudioPopover, StudioSpinner } from '@studio/components';
import { useBranchStatusQuery, useAppReleasesQuery } from '../../../hooks/queries';
import { useGetSelectedScopesQuery } from '../../../hooks/queries/useGetSelectedScopesQuery';
import { useOrgListQuery } from 'app-development/hooks/queries/useOrgListQuery';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useCurrentBranchQuery, useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { isServiceOwnerOrg } from 'app-development/utils/serviceOwnerOrgUtils';

export function ReleaseContainer() {
  const { org, app } = useStudioEnvironmentParams();
  const [popoverOpenClick, setPopoverOpenClick] = useState<boolean>(false);
  const [popoverOpenHover, setPopoverOpenHover] = useState<boolean>(false);

  const { data: releases = [] } = useAppReleasesQuery(org, app);
  const { data: repoStatus, isPending: isRepoStatusPending } = useRepoStatusQuery(org, app);
  const { data: orgs = {}, isPending: isOrgListPending } = useOrgListQuery();
  const isServiceOwnerApp = isServiceOwnerOrg(orgs, org);
  const { data: selectedMaskinportenScopes, isPending: selectedMaskinportenScopesIsPending } =
    useGetSelectedScopesQuery(isServiceOwnerApp);
  const { data: currentBranch, isPending: currentBranchIsPending } = useCurrentBranchQuery(
    org,
    app,
  );
  const branchName = currentBranch?.branchName;
  const { data: branchStatus, isPending: branchStatusIsPending } = useBranchStatusQuery(
    org,
    app,
    branchName,
  );

  const releaseOfLatestCommit: AppReleaseType | undefined = branchStatus
    ? releases.find((release) => release.targetCommitish === branchStatus.commit.id)
    : undefined;
  const hasMaskinportenScopeChanges = hasMaskinportenScopesChanged(
    releaseOfLatestCommit,
    selectedMaskinportenScopes?.scopes.map(({ scope }) => scope),
    isServiceOwnerApp,
  );
  const isLoading =
    isRepoStatusPending ||
    currentBranchIsPending ||
    branchStatusIsPending ||
    isOrgListPending ||
    (isServiceOwnerApp && selectedMaskinportenScopesIsPending);
  const { t } = useTranslation();

  function handlePopoverKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      setPopoverOpenClick(!popoverOpenClick);
    }
  }

  const queryClient = useQueryClient();
  useEffect(() => {
    const interval = setInterval(async () => {
      const index = releases.findIndex((release) => release.build.status !== BuildStatus.completed);
      if (index > -1) {
        await queryClient.invalidateQueries({
          queryKey: [QueryKey.AppReleases, org, app],
        });
      }
    }, 7777);
    return () => clearInterval(interval);
  }, [releases, queryClient, org, app]);

  const handlePopoverOpenClicked = (_: MouseEvent) => setPopoverOpenClick(!popoverOpenClick);
  const handlePopoverOpenHover = (_: MouseEvent) => setPopoverOpenHover(true);
  const handlePopoverClose = () => setPopoverOpenHover(false);

  function renderCreateRelease() {
    if (isLoading) {
      return (
        <>
          <div>
            <StudioSpinner aria-hidden spinnerTitle={t('app_create_release.loading')} />
          </div>
          {t('app_create_release.check_status')}
        </>
      );
    }
    if (!repoStatus) {
      return null;
    }
    if (!branchStatus) {
      return t('app_create_release.branch_not_shared');
    }
    if (
      releaseOfLatestCommit &&
      releaseOfLatestCommit.build.status === BuildStatus.completed &&
      releaseOfLatestCommit.build.result === BuildResult.succeeded &&
      !hasMaskinportenScopeChanges
    ) {
      return t('app_create_release.no_changes_on_current_release');
    }
    if (releaseOfLatestCommit && releaseOfLatestCommit.build.status !== BuildStatus.completed) {
      return t('app_create_release.still_building_release', {
        version: releaseOfLatestCommit.tagName,
      });
    }
    return <CreateRelease branchName={branchName} />;
  }

  function renderStatusIcon() {
    if (
      !branchStatus ||
      !repoStatus?.contentStatus ||
      !repoStatus?.contentStatus.length ||
      !releases.length
    ) {
      return <CheckmarkIcon />;
    }
    if (!!repoStatus?.contentStatus || !!repoStatus.aheadBy) {
      return <UploadIcon />;
    }
    return null;
  }

  function renderStatusMessage() {
    if (
      !branchStatus ||
      !repoStatus?.contentStatus ||
      !repoStatus?.contentStatus.length ||
      !releases.length
    ) {
      return t('app_create_release.ok');
    }
    if (releaseOfLatestCommit) {
      return t('app_create_release.local_changes_cant_build');
    }
    if (repoStatus.contentStatus) {
      return t('app_create_release.local_changes_can_build');
    }
    return null;
  }

  return (
    <div className={classes.appReleaseWrapper}>
      <div className={classes.versionHeader}>
        <div className={classes.versionHeaderTitle}>{t('app_release.release_tab_versions')}</div>
      </div>
      <div className={classes.versionSubHeader}>
        {branchName && <BuildSource branchName={branchName} branchStatus={branchStatus} />}
        <StudioPopover.TriggerContext>
          <StudioPopover.Trigger
            title={t('app_create_release.status_popover')}
            className={classes.appCreateReleaseStatusButton}
            onClick={handlePopoverOpenClicked}
            onMouseOver={handlePopoverOpenHover}
            onMouseLeave={handlePopoverClose}
            tabIndex={0}
            onKeyUp={handlePopoverKeyPress}
            variant='tertiary'
            icon={renderStatusIcon()}
          />
          <StudioPopover open={popoverOpenClick || popoverOpenHover} onClose={handlePopoverClose}>
            {renderStatusMessage()}
          </StudioPopover>
        </StudioPopover.TriggerContext>
      </div>
      <div className={classes.appReleaseCreateRelease}>{renderCreateRelease()}</div>
      <div className={classes.appReleaseHistoryTitle}>{t('app_release.earlier_releases')}</div>
      <div>
        {!!releases.length &&
          releases.map((release: AppReleaseType, index: number) => (
            <Release key={index} release={release} />
          ))}
      </div>
    </div>
  );
}

function hasMaskinportenScopesChanged(
  latestRelease: AppReleaseType | undefined,
  selectedScopes: string[] | undefined,
  isServiceOwnerApp: boolean,
): boolean {
  if (!latestRelease || !isServiceOwnerApp || !selectedScopes) {
    return false;
  }

  const releaseScopes = latestRelease.buildInputs?.maskinportenScopes;
  const currentScopes = normalizeScopeNames(selectedScopes);

  if (releaseScopes === undefined) {
    return currentScopes.length > 0;
  }

  return !hasSameScopes(normalizeScopeNames(releaseScopes), currentScopes);
}

function hasSameScopes(releaseScopes: string[], currentScopes: string[]): boolean {
  return (
    releaseScopes.length === currentScopes.length &&
    releaseScopes.every((scope, index) => scope === currentScopes[index])
  );
}

function normalizeScopeNames(scopes: string[]): string[] {
  return [...new Set(scopes)].sort((a, b) => a.localeCompare(b));
}
