import React, { useEffect, useState } from 'react';
import classes from './releaseContainer.module.css';
import type { IRelease } from '../../../sharedResources/appRelease/types';
import type { KeyboardEvent, MouseEvent } from 'react';
import { AltinnIconComponent } from 'app-shared/components/AltinnIcon';
import { BuildResult, BuildStatus } from '../../../sharedResources/appRelease/types';
import { Button, ButtonSize, ButtonVariant, Popover } from '@digdir/design-system-react';
import { CircularProgress } from '@mui/material';
import { CreateReleaseComponent } from '../components/createAppReleaseComponent';
import { ReleaseComponent } from '../components/appReleaseComponent';
import { Upload, SuccessStroke } from '@navikt/ds-icons';
import { gitCommitPath } from 'app-shared/api-paths';
import { useMediaQuery } from '../../../common/hooks';
import { useParams } from 'react-router-dom';
import { useAppReleases, useBranchStatus, useRepoStatus } from '../hooks/query-hooks';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { CacheKey } from 'app-shared/api-paths/cache-key';

export function ReleaseContainer() {
  const hiddenMdDown = useMediaQuery('(max-width: 1025px)');
  const { org, app } = useParams();
  const [popoverOpenClick, setPopoverOpenClick] = useState<boolean>(false);
  const [popoverOpenHover, setPopoverOpenHover] = useState<boolean>(false);

  const { data: releases = [] } = useAppReleases(org, app);
  const { data: repoStatus, isLoading: repoStatusIsLoading } = useRepoStatus(org, app);
  const { data: masterBranchStatus, isLoading: masterBranchStatusIsLoading } = useBranchStatus(
    org,
    app,
    'master'
  );

  const latestRelease: IRelease = releases && releases[0] ? releases[0] : null;

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
        await queryClient.invalidateQueries([CacheKey.AppReleases, org, app]);
      }
    }, 7777);
    return () => clearInterval(interval);
  }, [releases, queryClient, org, app]);

  const handlePopoverOpenClicked = (_: MouseEvent) => setPopoverOpenClick(!popoverOpenClick);
  const handlePopoverOpenHover = (_: MouseEvent) => setPopoverOpenHover(true);
  const handlePopoverClose = () => setPopoverOpenHover(false);

  function renderCreateRelease() {
    if (!masterBranchStatus) {
      return (
        <div className={classes.cannotCreateReleaseContainer}>
          {hiddenMdDown ? null : (
            <AltinnIconComponent
              iconClass={`${classes.renderCannotCreateReleaseIcon} ai ai-circle-exclamation`}
              iconColor='#E23B53'
            />
          )}
          <div>
            <div className={classes.cannotCreateReleaseTitle}>
              {t('app_create_release_errors.fetch_release_failed', {
                contactLink: 'mailto:tjenesteeier@altinn.no',
              })}
            </div>
            <div className={classes.cannotCreateReleaseSubTitle}>
              {t('app_create_release_errors.technical_error_code')}
            </div>
          </div>
        </div>
      );
    }
    if (repoStatusIsLoading || masterBranchStatusIsLoading) {
      return (
        <div style={{ padding: '2rem' }}>
          <div>
            <CircularProgress style={{ color: '#1EAEF7' }} />
          </div>
          <div style={{ padding: '1.2rem' }}>{t('app_create_release.check_status')}</div>
        </div>
      );
    }
    if (!masterBranchStatus || !repoStatus) {
      return null;
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
      return <SuccessStroke />;
    }
    if (!!repoStatus?.contentStatus || !!repoStatus.aheadBy) {
      return <Upload />;
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
        <Popover
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
              size={ButtonSize.Small}
              variant={ButtonVariant.Quiet}
            />
          }
        >
          {renderStatusMessage()}
        </Popover>
      </div>
      <div className={classes.appReleaseCreateRelease}>{renderCreateRelease()}</div>
      <div className={classes.appReleaseHistoryTitle}>{t('app_release.earlier_releases')}</div>
      <div className={classes.appReleaseHistory}>
        {!!releases.length &&
          releases.map((release: IRelease, index: number) => (
            <ReleaseComponent key={index} release={release} />
          ))}
      </div>
    </div>
  );
}
