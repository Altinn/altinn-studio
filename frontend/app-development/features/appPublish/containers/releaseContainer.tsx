import React, { useEffect, useState } from 'react';
import classes from './releaseContainer.module.css';
import type { AppRelease } from 'app-shared/types/AppRelease';
import type { KeyboardEvent, MouseEvent } from 'react';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';
import { Button, LegacyPopover } from '@digdir/design-system-react';
import { CreateReleaseComponent } from '../components/createAppReleaseComponent';
import { ReleaseComponent } from '../components/appReleaseComponent';
import { UploadIcon, CheckmarkIcon, XMarkOctagonFillIcon } from '@studio/icons';
import { gitCommitPath } from 'app-shared/api/paths';
import { useMediaQuery } from 'app-shared/hooks/useMediaQuery';
import { useBranchStatusQuery, useAppReleasesQuery } from '../../../hooks/queries';
import { Trans, useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { StudioSpinner } from '@studio/components';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export function ReleaseContainer() {
  const hiddenMdDown = useMediaQuery('(max-width: 1025px)');
  const { org, app } = useStudioUrlParams();
  const [popoverOpenClick, setPopoverOpenClick] = useState<boolean>(false);
  const [popoverOpenHover, setPopoverOpenHover] = useState<boolean>(false);

  const { data: releases = [] } = useAppReleasesQuery(org, app);
  const { data: repoStatus, isPending: isRepoStatusPending } = useRepoStatusQuery(org, app);
  const { data: masterBranchStatus, isPending: masterBranchStatusIsPending } = useBranchStatusQuery(
    org,
    app,
    'master',
  );

  const latestRelease: AppRelease = releases && releases[0] ? releases[0] : null;

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
        <div style={{ padding: '2rem' }}>
          <div>
            <StudioSpinner />
          </div>
          <div style={{ padding: '1.2rem' }}>{t('app_create_release.check_status')}</div>
        </div>
      );
    }
    if (!masterBranchStatus || !repoStatus) {
      return null;
    }
    if (!masterBranchStatus) {
      return (
        <div className={classes.cannotCreateReleaseContainer}>
          {hiddenMdDown ? null : (
            <XMarkOctagonFillIcon className={classes.renderCannotCreateReleaseIcon} />
          )}
          <div>
            <div className={classes.cannotCreateReleaseTitle}>
              <Trans i18nKey={'app_create_release_errors.fetch_release_failed'}>
                <a target='_blank' rel='noopener noreferrer' />
              </Trans>
            </div>
            <div className={classes.cannotCreateReleaseSubTitle}>
              {t('app_create_release_errors.technical_error_code')}
            </div>
          </div>
        </div>
      );
    }
    // Check if latest
    if (
      latestRelease &&
      latestRelease.targetCommitish === masterBranchStatus.commit.id &&
      latestRelease.build.status === BuildStatus.completed &&
      latestRelease.build.result === BuildResult.succeeded
    ) {
      return (
        <div style={{ padding: '2rem' }}>
          {t('app_create_release.no_changes_on_current_release')}
        </div>
      );
    }
    if (
      latestRelease &&
      latestRelease.targetCommitish === masterBranchStatus.commit.id &&
      latestRelease.build.status !== BuildStatus.completed
    ) {
      return (
        <div style={{ padding: '2rem' }}>
          {t('app_create_release.still_building_release', {
            version: latestRelease.targetCommitish,
          })}
        </div>
      );
    }
    return <CreateReleaseComponent />;
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
      return 'Ok';
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
          {t('app_release.release_title')} &nbsp;
          <a
            href={gitCommitPath(org, app, masterBranchStatus.commit.id)}
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
          {t('general.version')}
          &nbsp;
          {latestRelease.tagName}
          &nbsp;
          {t('general.contains')}
          &nbsp;
          <a href={gitCommitPath(org, app, masterBranchStatus.commit.id)}>
            {t('app_release.release_title_link')}
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
        <LegacyPopover
          className={classes.popover}
          open={popoverOpenClick || popoverOpenHover}
          trigger={
            <Button
              className={classes.appCreateReleaseStatusButton}
              onClick={handlePopoverOpenClicked}
              onMouseOver={handlePopoverOpenHover}
              onMouseLeave={handlePopoverClose}
              tabIndex={0}
              onKeyUp={handlePopoverKeyPress}
              icon={renderStatusIcon()}
              size='small'
              variant='tertiary'
            />
          }
        >
          {renderStatusMessage()}
        </LegacyPopover>
      </div>
      <div className={classes.appReleaseCreateRelease}>{renderCreateRelease()}</div>
      <div className={classes.appReleaseHistoryTitle}>{t('app_release.earlier_releases')}</div>
      <div className={classes.appReleaseHistory}>
        {!!releases.length &&
          releases.map((release: AppRelease, index: number) => (
            <ReleaseComponent key={index} release={release} />
          ))}
      </div>
    </div>
  );
}
