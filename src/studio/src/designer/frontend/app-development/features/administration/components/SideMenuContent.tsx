import * as React from 'react';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { makeStyles, Typography } from '@material-ui/core';
import { formatNameAndDate } from 'app-shared/utils/formatDate';
import AltinnButton from 'app-shared/components/AltinnButton';
import { useSelector } from 'react-redux';
import { ICommit, IRepository } from '../../../types/global';
import ResetRepoModal from './ResetRepoModal';
import RepoStatusActionDispatchers from '../../../sharedResources/repoStatus/repoStatusDispatcher';

// eslint-disable-next-line import/order
import classNames = require('classnames');

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

export interface ISideMenuContent {
  language: any;
  service: IRepository;
  initialCommit: ICommit;
}

const SideMenuContent = (props: ISideMenuContent): JSX.Element => {
  const classes = setupClasses();

  const [resetRepoModalOpen, setResetRepoModalOpen] = React.useState<boolean>(false);
  const [resetRepoModalAnchorEl, setResetRepoModalAnchorEl] = React.useState<any>(null);
  const [enableResetButton, setEnableResetButton] = React.useState<boolean>(false);

  const repoStatus = useSelector((state: IServiceDevelopmentState) => state.handleMergeConflict.repoStatus);

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
    RepoStatusActionDispatchers.resetLocalRepo(org, app);
  };

  React.useEffect(() => {
    if (repoStatus && (
      (repoStatus.aheadBy && repoStatus.aheadBy > 0)
      || (repoStatus.contentStatus && repoStatus.contentStatus.length > 0))
    ) {
      setEnableResetButton(true);
    } else {
      setEnableResetButton(false);
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
      <Typography className={classNames(classes.sidebarServiceOwner, classes.sidebarInfoText)}>
        <img
          src={props.service.owner.avatar_url}
          className={classNames(classes.avatar)}
          alt=''
        /> {props.service.owner.full_name || props.service.owner.login}
      </Typography>
      {props.initialCommit &&
        <Typography className={classNames(classes.sidebarCreatedBy)}>
          {/* tslint:disable-next-line:max-line-length */}
          {getLanguageFromKey('administration.created_by', props.language)} {formatNameAndDate(props.initialCommit.author.name, props.service.created_at)}
        </Typography>
      }
      {/* Reset local repository */}
      <Typography className={classNames(classes.sidebarHeader, classes.sidebarHeaderSecond)}>
        {getLanguageFromKey('administration.reset_repo_heading', props.language)}
      </Typography>
      <Typography className={classNames(classes.sidebarInfoText, classes.sidebarInfoTextList)} component='div'>
        <ul>
          <li>{getLanguageFromKey('administration.reset_repo_info_i1', props.language)}</li>
          <li>{getLanguageFromKey('administration.reset_repo_info_i2', props.language)}</li>
          <li>{getLanguageFromKey('administration.reset_repo_info_i3', props.language)}</li>
        </ul>
      </Typography>
      <AltinnButton
        id='reset-repo-button'
        btnText={getLanguageFromKey('administration.reset_repo_button', props.language)}
        onClickFunction={onClickResetRepo}
        disabled={!enableResetButton}
      />
      <ResetRepoModal
        anchorEl={resetRepoModalAnchorEl}
        handleClickResetRepo={handleResetRepoClick}
        language={props.language}
        onClose={onCloseModal}
        open={resetRepoModalOpen}
        repositoryName={props.service.name}
      />
    </>
  );
};

export default SideMenuContent;
