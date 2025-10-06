import React, { useEffect, useState } from 'react';
import classes from './ReleaseContainer.module.css';
import type { AppRelease as AppReleaseType } from 'app-shared/types/AppRelease';
import type { KeyboardEvent, MouseEvent } from 'react';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';
import { CreateRelease } from '../components/CreateRelease';
import { Release } from '../components/Release';
import { UploadIcon, CheckmarkIcon } from '@studio/icons';
import { gitCommitPath } from 'app-shared/api/paths';
import { StudioPopover, StudioError } from '@studio/components-legacy';
import { StudioParagraph, StudioSpinner } from '@studio/components';
import { useBranchStatusQuery, useAppReleasesQuery } from '../../../hooks/queries';
import { Trans, useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Link } from '@digdir/designsystemet-react';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';

export function ReleaseContainer() {
  const { org, app } = useStudioEnvironmentParams();
  const [popoverOpenClick, setPopoverOpenClick] = useState<boolean>(false);
  const [popoverOpenHover, setPopoverOpenHover] = useState<boolean>(false);
  const packagesRouter = new PackagesRouter({ app, org });

  const { data: releases = [] } = useAppReleasesQuery(org, app);
  const { data: repoStatus, isPending: isRepoStatusPending } = useRepoStatusQuery(org, app);
  const { data: masterBranchStatus, isPending: masterBranchStatusIsPending } = useBranchStatusQuery(
    org,
    app,
    'master',
  );

  const latestRelease: AppReleaseType = releases && releases[0] ? releases[0] : null;

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
    if (isRepoStatusPending || masterBranchStatusIsPending) {
      return (
        <>
          <div>
            <StudioSpinner aria-hidden spinnerTitle={t('app_create_release.loading')} />
          </div>
          {t('app_create_release.check_status')}
        </>
      );
    }
    if (!masterBranchStatus || !repoStatus) {
      return null;
    }
    if (!masterBranchStatus) {
      return (
        <StudioError>
          <StudioParagraph>
            <Trans
              i18nKey={'app_create_release_errors.fetch_release_failed'}
              components={{
                a: <Link href='/info/contact'> </Link>,
              }}
            ></Trans>
          </StudioParagraph>
        </StudioError>
      );
    }
    // Check if latest
    if (
      latestRelease &&
      latestRelease.targetCommitish === masterBranchStatus.commit.id &&
      latestRelease.build.status === BuildStatus.completed &&
      latestRelease.build.result === BuildResult.succeeded
    ) {
      return t('app_create_release.no_changes_on_current_release');
    }
    if (
      latestRelease &&
      latestRelease.targetCommitish === masterBranchStatus.commit.id &&
      latestRelease.build.status !== BuildStatus.completed
    ) {
      return t('app_create_release.still_building_release', {
        version: latestRelease.targetCommitish,
      });
    }
    return <CreateRelease />;
  }

  function renderStatusIcon() {
    if (
      !masterBranchStatus ||
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
      !masterBranchStatus ||
      !repoStatus?.contentStatus ||
      !repoStatus?.contentStatus.length ||
      !releases.length
    ) {
      return t('app_create_release.ok');
    }
    if (!releases || !releases.length) {
      return null;
    }
    if (!!latestRelease && latestRelease.targetCommitish === masterBranchStatus.commit.id) {
      return t('app_create_release.local_changes_cant_build');
    }
    if (repoStatus.contentStatus) {
      return t('app_create_release.local_changes_can_build');
    }
    return null;
  }

  function renderCreateReleaseTitle() {
    if (!masterBranchStatus || !repoStatus?.contentStatus) {
      return null;
    }

    if (
      !latestRelease ||
      latestRelease.targetCommitish !== masterBranchStatus.commit.id ||
      !repoStatus?.contentStatus
    ) {
      return (
        <>
          {t('app_release.release_title')}
          <a
            href={packagesRouter.getPackageNavigationUrl('latestCommit')}
            target='_blank'
            rel='noopener noreferrer'
          >
            {t('app_release.release_title_link')}
          </a>
        </>
      );
    }
    if (latestRelease.targetCommitish === masterBranchStatus.commit.id) {
      return (
        <>
          {t('app_release.release_built_on_version', { version: latestRelease.tagName })}
          <a
            href={gitCommitPath(org, app, masterBranchStatus.commit.id)}
            target='_blank'
            rel='noopener noreferrer'
          >
            {t('app_release.release_built_on_version_link')}
          </a>
        </>
      );
    }
    return null;
  }

  return (
    <div className={classes.appReleaseWrapper}>
      <div className={classes.versionHeader}>
        <div className={classes.versionHeaderTitle}>{t('app_release.release_tab_versions')}</div>
      </div>
      <div className={classes.versionSubHeader}>
        <div className={classes.appCreateReleaseTitle}>{renderCreateReleaseTitle()}</div>
        <StudioPopover open={popoverOpenClick || popoverOpenHover}>
          <StudioPopover.Trigger
            title={t('app_create_release.status_popover')}
            className={classes.appCreateReleaseStatusButton}
            onClick={handlePopoverOpenClicked}
            onMouseOver={handlePopoverOpenHover}
            onMouseLeave={handlePopoverClose}
            tabIndex={0}
            onKeyUp={handlePopoverKeyPress}
            variant='tertiary'
          >
            {renderStatusIcon()}
          </StudioPopover.Trigger>
          <StudioPopover.Content>{renderStatusMessage()}</StudioPopover.Content>
        </StudioPopover>
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
