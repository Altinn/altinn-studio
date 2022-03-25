import React from 'react';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { makeStyles, Typography } from '@material-ui/core';
import { formatNameAndDate } from 'app-shared/utils/formatDate';
import AltinnButton from 'app-shared/components/AltinnButton';
import classNames from 'classnames';
import type { ICommit, IRepository } from '../../../types/global';
import ResetRepoModal from './ResetRepoModal';
import { RepoStatusActions } from '../../../sharedResources/repoStatus/repoStatusSlice';
import DownloadRepoModal from './DownloadRepoModal';
import { useAppDispatch, useAppSelector } from 'common/hooks';

const setupClasses = makeStyles({
  avatar: {
    maxHeight: '2em',
  },
  sidebarHeader: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 500,
  },
  sidebarHeaderSecond: {
    marginTop: 36,
  },
  sidebarInfoText: {
    fontSize: 16,
    marginBottom: 12,
  },
  sidebarInfoTextList: {
    paddingLeft: 18,
  },
  sidebarServiceOwner: {
    marginTop: 10,
  },
  sidebarCreatedBy: {
    fontSize: 16,
    marginTop: 10,
  },
});

interface ISideMenuContent {
  language: any;
  service: IRepository;
  initialCommit: ICommit;
}

const SideMenuContent = (props: ISideMenuContent): JSX.Element => {
  const classes = setupClasses();
  const dispatch = useAppDispatch();

  const [resetRepoModalOpen, setResetRepoModalOpen] =
    React.useState<boolean>(false);
  const [resetRepoModalAnchorEl, setResetRepoModalAnchorEl] =
    React.useState<any>(null);
  const [downloadModalOpen, setDownloadModalOpen] =
    React.useState<boolean>(false);
  const downloadModalRef = React.useRef<HTMLElement>();

  const repoStatus = useAppSelector(
    (state) => state.handleMergeConflict.repoStatus,
  );

  const toggleDownloadModal = () => {
    setDownloadModalOpen(!downloadModalOpen);
  };

  const onCloseModal = () => {
    setResetRepoModalOpen(false);
  };

  const onClickResetRepo = () => {
    setResetRepoModalAnchorEl(document.getElementById('reset-repo-button'));
    setResetRepoModalOpen(true);
  };

  const handleResetRepoClick = () => {
    const altinnWindow: any = window;
    const { org, app } = altinnWindow;
    dispatch(RepoStatusActions.resetLocalRepo({ org, repo: app }));
  };

  React.useEffect(() => {
    if (
      repoStatus &&
      !(
        (repoStatus.aheadBy && repoStatus.aheadBy > 0) ||
        (repoStatus.contentStatus && repoStatus.contentStatus.length > 0)
      )
    ) {
      setResetRepoModalOpen(false);
    }
  }, [repoStatus]);

  return (
    <>
      {/* App owner info */}
      <Typography className={classes.sidebarHeader}>
        {getLanguageFromKey('general.service_owner', props.language)}
      </Typography>
      <Typography className={classes.sidebarInfoText}>
        {getLanguageFromKey('administration.service_owner_is', props.language)}
      </Typography>
      <Typography
        className={classNames(
          classes.sidebarServiceOwner,
          classes.sidebarInfoText,
        )}
      >
        <img
          src={props.service.owner.avatar_url}
          className={classNames(classes.avatar)}
          alt=''
        />{' '}
        {props.service.owner.full_name || props.service.owner.login}
      </Typography>
      {props.initialCommit && (
        <Typography className={classNames(classes.sidebarCreatedBy)}>
          {getLanguageFromKey('administration.created_by', props.language)}{' '}
          {formatNameAndDate(
            props.initialCommit.author.name,
            props.service.created_at,
          )}
        </Typography>
      )}
      {/* Reset local repository */}
      <Typography
        className={classNames(
          classes.sidebarHeader,
          classes.sidebarHeaderSecond,
        )}
      >
        {getLanguageFromKey(
          'administration.reset_repo_heading',
          props.language,
        )}
      </Typography>
      <Typography
        className={classNames(
          classes.sidebarInfoText,
          classes.sidebarInfoTextList,
        )}
        component='div'
      >
        <ul>
          <li>
            {getLanguageFromKey(
              'administration.reset_repo_info_i1',
              props.language,
            )}
          </li>
          <li>
            {getLanguageFromKey(
              'administration.reset_repo_info_i2',
              props.language,
            )}
          </li>
          <li>
            {getLanguageFromKey(
              'administration.reset_repo_info_i3',
              props.language,
            )}
          </li>
        </ul>
      </Typography>
      <AltinnButton
        id='reset-repo-button'
        btnText={getLanguageFromKey(
          'administration.reset_repo_button',
          props.language,
        )}
        onClickFunction={onClickResetRepo}
      />
      <ResetRepoModal
        anchorEl={resetRepoModalAnchorEl}
        handleClickResetRepo={handleResetRepoClick}
        language={props.language}
        onClose={onCloseModal}
        open={resetRepoModalOpen}
        repositoryName={props.service.name}
      />
      {/* Download local repository */}
      <Typography
        className={classNames(
          classes.sidebarHeader,
          classes.sidebarHeaderSecond,
        )}
      >
        {getLanguageFromKey('administration.download_repo', props.language)}
      </Typography>
      <AltinnButton
        btnText={getLanguageFromKey(
          'administration.download_repo',
          props.language,
        )}
        onClickFunction={toggleDownloadModal}
        ref={downloadModalRef}
      />
      <DownloadRepoModal
        anchorRef={downloadModalRef}
        language={props.language}
        onClose={toggleDownloadModal}
        open={downloadModalOpen}
      />
    </>
  );
};

export default SideMenuContent;
