import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  ButtonColor,
  ButtonVariant,
} from '@altinn/altinn-design-system';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { formatNameAndDate } from 'app-shared/utils/formatDate';
import type { ICommit, IRepository } from '../../../types/global';
import { RepositoryType } from 'app-shared/types/global';
import { ResetRepoModal } from './ResetRepoModal';
import { RepoStatusActions } from '../../../sharedResources/repoStatus/repoStatusSlice';
import { DownloadRepoModal } from './DownloadRepoModal';
import classes from './SideMenuContent.module.css';
import { useAppDispatch, useAppSelector } from '../../../common/hooks';
import { useParams } from 'react-router-dom';

interface ISideMenuContent {
  language: any;
  service: IRepository;
  initialCommit: ICommit;
  repoType: RepositoryType;
}

export const SideMenuContent = (props: ISideMenuContent): JSX.Element => {
  const dispatch = useAppDispatch();
  const { org, app } = useParams();
  const [resetRepoModalOpen, setResetRepoModalOpen] = useState<boolean>(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);

  const repoStatus = useAppSelector(
    (state) => state.handleMergeConflict.repoStatus,
  );

  const toggleDownloadModal = () => setDownloadModalOpen(!downloadModalOpen);
  const onCloseModal = () => setResetRepoModalOpen(false);
  const onClickResetRepo = () => setResetRepoModalOpen(true);
  const handleResetRepoClick = () => dispatch(RepoStatusActions.resetLocalRepo({ org, repo: app }));

  useEffect(() => {
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

  const downloadModalAnchor = useRef<HTMLDivElement>();
  const resetRepoModalAnchor = useRef<HTMLDivElement>();
  const t = (key: string) => getLanguageFromKey(key, props.language);
  return (
    <div className={classes.container}>
      {/* App owner info */}
      <h3>{t('general.service_owner')}</h3>
      <div>
        {t(
          props.repoType === RepositoryType.Datamodels
            ? 'administration.repo_owner_is'
            : 'administration.service_owner_is',
        )}
      </div>
      <div>
        <img
          src={props.service.owner.avatar_url}
          style={{ maxHeight: '2em' }}
          alt=''
        />{' '}
        {props.service.owner.full_name || props.service.owner.login}
      </div>
      {props.initialCommit && (
        <div>
          {t('administration.created_by')}{' '}
          {formatNameAndDate(
            props.initialCommit.author.name,
            props.service.created_at,
          )}
        </div>
      )}
      {/* Reset local repository */}
      <h3>{t('administration.reset_repo_heading')}</h3>
      <div style={{ paddingLeft: '18px' }}>
        <ul>
          <li>{t('administration.reset_repo_info_i1')}</li>
          <li>{t('administration.reset_repo_info_i2')}</li>
          <li>{t('administration.reset_repo_info_i3')}</li>
        </ul>
      </div>
      <Button
        color={ButtonColor.Secondary}
        id='reset-repo-button'
        onClick={onClickResetRepo}
        variant={ButtonVariant.Outline}
      >
        {t('administration.reset_repo_button')}
      </Button>
      <div ref={resetRepoModalAnchor} />
      <ResetRepoModal
        anchorRef={resetRepoModalAnchor}
        handleClickResetRepo={handleResetRepoClick}
        language={props.language}
        onClose={onCloseModal}
        open={resetRepoModalOpen}
        repositoryName={props.service.name}
      />
      {/* Download local repository */}
      <h3>{t('administration.download_repo')}</h3>
      <Button
        color={ButtonColor.Secondary}
        onClick={toggleDownloadModal}
        variant={ButtonVariant.Outline}
      >
        {t('administration.download_repo')}
      </Button>
      <div ref={downloadModalAnchor} />
      <DownloadRepoModal
        anchorRef={downloadModalAnchor}
        language={props.language}
        onClose={toggleDownloadModal}
        open={downloadModalOpen}
      />
    </div>
  );
};
