import React, { useEffect, useState } from 'react';
import classes from './releaseContainer.module.css';
import type { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseSlice';
import type { IHandleMergeConflict } from '../../handleMergeConflict/handleMergeConflictSlice';
import type { IRelease } from '../../../sharedResources/appRelease/types';
import type { IRepoStatusState } from '../../../sharedResources/repoStatus/repoStatusSlice';
import type { KeyboardEvent, MouseEvent } from 'react';
import { AltinnIconComponent } from 'app-shared/components/AltinnIcon';
import { AppReleaseActions } from '../../../sharedResources/appRelease/appReleaseSlice';
import { BuildResult, BuildStatus } from '../../../sharedResources/appRelease/types';
import { Button, ButtonSize, ButtonVariant, Popover } from '@digdir/design-system-react';
import { CircularProgress } from '@mui/material';
import { CreateReleaseComponent } from '../components/createAppReleaseComponent';
import { ReleaseComponent } from '../components/appReleaseComponent';
import { RepoStatusActions } from '../../../sharedResources/repoStatus/repoStatusSlice';
import { Upload, SuccessStroke } from '@navikt/ds-icons';
import { fetchRepoStatus } from '../../handleMergeConflict/handleMergeConflictSlice';
import { getParsedLanguageFromKey } from 'app-shared/utils/language';
import { gitCommitPath, repoStatusPath } from 'app-shared/api-paths';
import { useAppDispatch, useAppSelector, useMediaQuery } from '../../../common/hooks';
import { useParams } from 'react-router-dom';

export function ReleaseContainer() {
  const hiddenMdDown = useMediaQuery('(max-width: 1025px)');
  const dispatch = useAppDispatch();

  const [anchorElement, setAchorElement] = useState<Element>();
  const [popoverOpenClick, setPopoverOpenClick] = useState<boolean>(false);
  const [popoverOpenHover, setPopoverOpenHover] = useState<boolean>(false);

  const appReleases: IAppReleaseState = useAppSelector((state) => state.appReleases);
  const latestRelease: IRelease = appReleases.releases[0] ? appReleases.releases[0] : null;
  const repoStatus: IRepoStatusState = useAppSelector((state) => state.repoStatus);
  const handleMergeConflict: IHandleMergeConflict = useAppSelector((s) => s.handleMergeConflict);

  const language: any = useAppSelector((state) => state.languageState.language);
  const t = (key: string, params?: any) => getParsedLanguageFromKey(key, language, params || []);

  const { org, app } = useParams();

  useEffect(() => {
    dispatch(AppReleaseActions.getAppReleaseStartInterval());
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
            {t('app_create_release_errors.fetch_release_failed', ['mailto:tjenesteeier@altinn.no'])}
          </div>
          <div className={classes.cannotCreateReleaseSubTitle}>
            {t('app_create_release_errors.technical_error_code')}
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
          <div style={{ padding: '1.2rem' }}>{t('app_create_release.check_status')}</div>
        </div>
      );
    }
    if (appReleases.errors.fetchReleaseErrorCode !== null) {
      return null;
    }
    if (!latestRelease) {
      return <CreateReleaseComponent />;
    }
    if (!repoStatus.branch.master || !handleMergeConflict.repoStatus) {
      return null;
    }
    // Check if latest
    if (
      !!latestRelease &&
      latestRelease.targetCommitish === repoStatus.branch.master.commit.id &&
      latestRelease.build.status === BuildStatus.completed &&
      latestRelease.build.result === BuildResult.succeeded
    ) {
      return null;
    }
    if (latestRelease.build.status !== BuildStatus.completed) {
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
      !handleMergeConflict.repoStatus.contentStatus ||
      !handleMergeConflict.repoStatus.contentStatus.length ||
      !appReleases.releases.length
    ) {
      return 'Ok';
    }
    if (!appReleases.releases || !appReleases.releases.length) {
      return null;
    }
    if (!!latestRelease && latestRelease.targetCommitish === repoStatus.branch.master.commit.id) {
      return t('app_create_release.local_changes_can_build');
    }
    if (handleMergeConflict.repoStatus.contentStatus) {
      return t('app_create_release.local_changes_cant_build');
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

    if (
      !latestRelease ||
      latestRelease.targetCommitish !== repoStatus.branch.master.commit.id ||
      !handleMergeConflict.repoStatus.contentStatus
    ) {
      return (
        <>
          {t('app_release.release_title')} &nbsp;
          {repoStatus.branch.master ? (
            <a
              href={gitCommitPath(org, app, repoStatus.branch.master.commit.id)}
              target='_blank'
              rel='noopener noreferrer'
            >
              {t('app_release.release_title_link')}
            </a>
          ) : null}
        </>
      );
    }
    if (latestRelease.targetCommitish === repoStatus.branch.master.commit.id) {
      return (
        <>
          {t('general.version')}
          &nbsp;
          {latestRelease.tagName}
          &nbsp;
          {t('general.contains')}
          &nbsp;
          <a href={gitCommitPath(org, app, repoStatus.branch.master.commit.id)}>
            {t('app_release.release_title_link')}
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
                onKeyPress={handlePopoverKeyPress}
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
          {!!appReleases.releases.length &&
            appReleases.releases.map((release: IRelease, index: number) => (
              <ReleaseComponent key={index} release={release} />
            ))}
        </div>
      </div>
    </>
  );
}
