import React from 'react';
import { Popover } from '@mui/material';
import { StudioButton } from '@studio/components';
import classes from './RepoModal.module.css';
import { repoDownloadPath } from 'app-shared/api/paths';
import { Trans, useTranslation } from 'react-i18next';

interface IDownloadRepoModalProps {
  anchorRef: React.MutableRefObject<Element>;
  onClose: any;
  open: boolean;
  org: string;
  app: string;
}

export function DownloadRepoModal(props: IDownloadRepoModalProps) {
  const { t } = useTranslation();
  return (
    <div>
      <Popover
        open={props.open}
        anchorEl={props.anchorRef.current}
        onClose={props.onClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
      >
        <div className={classes.modalContainer}>
          <h2>{t('overview.download_repo_heading')}</h2>
          <p>
            <Trans i18nKey={'overview.download_repo_info'} />
          </p>
          <p>
            <a href={repoDownloadPath(props.org, props.app)}>
              {t('overview.download_repo_changes')}
            </a>
          </p>
          <p>
            <a href={repoDownloadPath(props.org, props.app, true)}>
              {t('overview.download_repo_full')}
            </a>
          </p>
          <div className={classes.buttonContainer}>
            <StudioButton color='second' onClick={props.onClose} variant='secondary' size='small'>
              {t('general.cancel')}
            </StudioButton>
          </div>
        </div>
      </Popover>
    </div>
  );
}
