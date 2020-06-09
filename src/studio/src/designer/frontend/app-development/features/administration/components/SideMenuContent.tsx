import * as React from 'react';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { makeStyles, Typography } from '@material-ui/core';
import { formatNameAndDate } from 'app-shared/utils/formatDate';
import AltinnButton from 'app-shared/components/AltinnButton';
import { ICommit, IRepository } from '../../../types/global';
import ResetRepoModal from './ResetRepoModal';

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
  handleResetRepoClick: () => void;
}

const SideMenuContent = (props: ISideMenuContent): JSX.Element => {
  const classes = setupClasses();

  const [resetRepoModalOpen, setResetRepoModalOpen] = React.useState<boolean>(false);
  const [resetRepoModalAnchorEl, setResetRepoModalAnchorEl] = React.useState<any>(null);

  const onCloseModal = () => {
    setResetRepoModalOpen(false);
  };

  const onClickResetRepo = () => {
    setResetRepoModalAnchorEl(document.getElementById('reset-repo-button'));
    setResetRepoModalOpen(true);
  };

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
        {getLanguageFromKey('Slett mine endringer', props.language)}
      </Typography>
      <Typography className={classes.sidebarInfoText}>
        {getLanguageFromKey('Dette er skumle saker, vær forsiktig!', props.language)}
      </Typography>
      <AltinnButton
        id='reset-repo-button'
        btnText={getLanguageFromKey('Slett mine endringer', props.language)}
        onClickFunction={onClickResetRepo}
      />
      <ResetRepoModal
        anchorEl={resetRepoModalAnchorEl}
        handleClickResetRepo={props.handleResetRepoClick}
        language={props.language}
        onClose={onCloseModal}
        open={resetRepoModalOpen}
        repositoryName={props.service.name}
      />
    </>
  );
};

export default SideMenuContent;
