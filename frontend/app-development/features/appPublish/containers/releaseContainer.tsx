import type { KeyboardEvent, MouseEvent } from 'react';
import React, { useEffect, useState } from 'react';
import classes from './releaseContainer.module.css';
import type { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseSlice';
import { AppReleaseActions } from '../../../sharedResources/appRelease/appReleaseSlice';
import type { IHandleMergeConflictState } from '../../handleMergeConflict/handleMergeConflictSlice';
import { fetchRepoStatus } from '../../handleMergeConflict/handleMergeConflictSlice';
import type { IRelease } from '../../../sharedResources/appRelease/types';
import { BuildResult, BuildStatus } from '../../../sharedResources/appRelease/types';
import type { IRepoStatusState } from '../../../sharedResources/repoStatus/repoStatusSlice';
import { RepoStatusActions } from '../../../sharedResources/repoStatus/repoStatusSlice';
import { AltinnIconComponent } from 'app-shared/components/AltinnIcon';
import { CircularProgress, Popover } from '@mui/material';
import { CreateReleaseComponent } from '../components/createAppReleaseComponent';
import { ReleaseComponent } from '../components/appReleaseComponent';
import { fetchLanguage } from '../../../utils/fetchLanguage/languageSlice';
import { frontendLangPath, gitCommitPath, repoStatusPath } from 'app-shared/api-paths';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';
import { useAppDispatch, useAppSelector, useMediaQuery } from '../../../common/hooks';
import { useParams } from 'react-router-dom';
import { Button, ButtonSize, ButtonVariant } from '@altinn/altinn-design-system';
import { Upload, SuccessStroke } from '@navikt/ds-icons';

export function ReleaseContainer() {
  const hiddenMdDown = useMediaQuery('(max-width: 1025px)');
  const dispatch = useAppDispatch();

  const [anchorElement, setAchorElement] = useState<Element>();

  const [popoverOpenClick, setPopoverOpenClick] = useState<boolean>(false);
  const [popoverOpenHover, setPopoverOpenHover] = useState<boolean>(false);

  const appReleases: IAppReleaseState = useAppSelector((state) => state.appReleases);
  const repoStatus: IRepoStatusState = useAppSelector((state) => state.repoStatus);
  const handleMergeConflict: IHandleMergeConflictState = useAppSelector(
    (state) => state.handleMergeConflict
  );
  const language: any = useAppSelector((state) => state.languageState.language);
  const { org, app } = useParams();

  useEffect(() => {
    dispatch(AppReleaseActions.getAppReleaseStartInterval());
    if (!language) {
      dispatch(fetchLanguage({ url: frontendLangPath('nb') }));
    }
    dispatch(RepoStatusActions.getMasterRepoStatus({ org, repo: app }));
    dispatch(
      fetchRepoStatus({
        url: repoStatusPath(org, app),
        org,
        repo: app,
      })
    );
    return () => {
      dispatch(AppReleaseActions.getAppReleaseStopInterval());
    };
  }, [dispatch, language, org, app]);

  function handlePopoverKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      if (!anchorElement) {
        setAchorElement(event.currentTarget);
      }
      setPopoverOpenClick(!popoverOpenClick);
    }
  }

  function handlePopoverOpenClicked(event: MouseEvent) {
    if (!anchorElement) {
      setAchorElement(event.currentTarget);
    }
    setPopoverOpenClick(!popoverOpenClick);
  }

  function handlePopoverOpenHover(event: MouseEvent) {
    setAchorElement(event.currentTarget);
    setPopoverOpenHover(true);
  }

  function handlePopoverClose() {
    if (popoverOpenHover) {
      setPopoverOpenHover(!popoverOpenHover);
    }
  }

  function renderCannotCreateRelease() {
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
            {getParsedLanguageFromKey('app_create_release_errors.fetch_release_failed', language, [
              'mailto:tjenesteeier@altinn.no',
            ])}
          </div>
          <div className={classes.cannotCreateReleaseSubTitle}>
            {getLanguageFromKey('app_create_release_errors.technical_error_code', language)}
            &nbsp;
            {appReleases.errors.fetchReleaseErrorCode}
          </div>
        </div>
      </div>
    );
  }

  function renderCreateRelease() {
    if (appReleases.errors.fetchReleaseErrorCode !== null) {
      return renderCannotCreateRelease();
    }
    if (!repoStatus.branch.master || !handleMergeConflict.repoStatus.contentStatus) {
      return (
        <div style={{ padding: '2rem' }}>
          <div>
            <CircularProgress style={{ color: '#1EAEF7' }} />
          </div>
          <div style={{ padding: '1.2rem' }}>
            {getLanguageFromKey('app_create_release.check_status', language)}
          </div>
        </div>
      );
    }
    if (appReleases.errors.fetchReleaseErrorCode !== null) {
      return null;
    }
    if (!appReleases.releases || !appReleases.releases.length) {
      return <CreateReleaseComponent />;
    }
    if (!handleMergeConflict.repoStatus || !repoStatus.branch.master) {
      return null;
    }
    // Check if latest
    if (
      !!appReleases.releases[0] &&
      appReleases.releases[0].targetCommitish === repoStatus.branch.master.commit.id &&
      appReleases.releases[0].build.status === BuildStatus.completed &&
      appReleases.releases[0].build.result === BuildResult.succeeded
    ) {
      return null;
    }
    if (appReleases.releases[0].build.status !== BuildStatus.completed) {
      return null;
    }
    return <CreateReleaseComponent />;
  }

  function renderStatusIcon() {
    if (
      !repoStatus.branch.master ||
      !handleMergeConflict.repoStatus.contentStatus ||
      !handleMergeConflict.repoStatus.contentStatus.length ||
      !appReleases.releases.length
    ) {
      return <SuccessStroke />;
    }
    if (
      !!handleMergeConflict.repoStatus.contentStatus ||
      !!handleMergeConflict.repoStatus.aheadBy
    ) {
      return <Upload />;
    }
    return null;
  }

  function renderStatusMessage() {
    if (
      !repoStatus.branch.master ||
      !appReleases.releases ||
      !handleMergeConflict.repoStatus.contentStatus
    ) {
      return null;
    }
    if (!appReleases.releases || !appReleases.releases.length) {
      return null;
    }
    if (
      !!appReleases.releases[0] &&
      repoStatus.branch.master.commit.id === appReleases.releases[0].targetCommitish
    ) {
      return getLanguageFromKey('app_create_release.local_changes_cant_build', language);
    }
    if (handleMergeConflict.repoStatus.contentStatus) {
      return getLanguageFromKey('app_create_release.local_changes_can_build', language);
    }
    return null;
  }

  function renderCreateReleaseTitle() {
    if (
      !!appReleases.errors.fetchReleaseErrorCode ||
      !repoStatus.branch.master ||
      !handleMergeConflict.repoStatus.contentStatus
    ) {
      return null;
    }
    const latestRelease: IRelease = appReleases.releases[0] ? appReleases.releases[0] : null;
    if (
      !latestRelease ||
      latestRelease.targetCommitish !== repoStatus.branch.master.commit.id ||
      !handleMergeConflict.repoStatus.contentStatus
    ) {
      return (
        <>
          {getLanguageFromKey('app_release.release_title', language)} &nbsp;
          {repoStatus.branch.master ? (
            <a
              href={gitCommitPath(org, app, repoStatus.branch.master.commit.id)}
              target='_blank'
              rel='noopener noreferrer'
            >
              {getLanguageFromKey('app_release.release_title_link', language)}
            </a>
          ) : null}
        </>
      );
    }
    if (latestRelease.targetCommitish === repoStatus.branch.master.commit.id) {
      return (
        <>
          {getLanguageFromKey('general.version', language)}
          &nbsp;
          {appReleases.releases[0].tagName}
          &nbsp;
          {getLanguageFromKey('general.contains', language)}
          &nbsp;
          <a href={gitCommitPath(org, app, repoStatus.branch.master.commit.id)}>
            {getLanguageFromKey('app_release.release_title_link', language)}
          </a>
        </>
      );
    }
    return null;
  }

  return (
    <>
      <div className={classes.appReleaseWrapper}>
        <div className={classes.versionHeader}>
          <div className={classes.versionHeaderTitle}>
            {getLanguageFromKey('app_release.release_tab_versions', language)}
          </div>
        </div>
        <div className={classes.versionSubHeader}>
          <div className={classes.appCreateReleaseTitle}>{renderCreateReleaseTitle()}</div>
          <Button
            className={classes.appCreateReleaseStatusIcon}
            onClick={handlePopoverOpenClicked}
            onMouseOver={handlePopoverOpenHover}
            onMouseLeave={handlePopoverClose}
            tabIndex={0}
            onKeyPress={handlePopoverKeyPress}
            icon={renderStatusIcon()}
            size={ButtonSize.Small}
            variant={ButtonVariant.Quiet}
          />
        </div>
        <div className={classes.appReleaseCreateRelease}>{renderCreateRelease()}</div>
        <div className={classes.appReleaseHistoryTitle}>
          {getLanguageFromKey('app_release.earlier_releases', language)}
        </div>
        <div className={classes.appReleaseHistory}>
          {!!appReleases.releases.length &&
            appReleases.releases.map((release: IRelease, index: number) => (
              <ReleaseComponent key={index} release={release} />
            ))}
        </div>
      </div>
      <Popover
        className={classes.popover}
        classes={{ paper: classes.popoverPaper }}
        anchorEl={anchorElement}
        open={popoverOpenClick || popoverOpenHover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        onClose={handlePopoverClose}
      >
        {renderStatusMessage()}
      </Popover>
    </>
  );
}
