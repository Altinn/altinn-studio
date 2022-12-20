import React from 'react';
import { Popover } from '@mui/material';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { getLanguageFromKey } from 'app-shared/utils/language';
import classes from './RepoModal.module.css';
import { useParams } from 'react-router-dom';
import { repoDownloadPath } from 'app-shared/api-paths';

interface IDownloadRepoModalProps {
  anchorRef: React.MutableRefObject<Element>;
  onClose: any;
  open: boolean;
  language: any;
}

export function DownloadRepoModal(props: IDownloadRepoModalProps) {
  const { org, app } = useParams();
  const t = (key: string) => getLanguageFromKey(key, props.language);
  return (
    <div data-testid='download-repo-container'>
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
        data-testid='download-repo-popover'
      >
        <div className={classes.modalContainer}>
          <h2>{t('administration.download_repo_heading')}</h2>
          <p>{t('administration.download_repo_info')}</p>
          <p>
            <a href={repoDownloadPath(org, app)}>{t('administration.download_repo_changes')}</a>
          </p>
          <p>
            <a href={repoDownloadPath(org, app, true)}>{t('administration.download_repo_full')}</a>
          </p>
          <div className={classes.buttonContainer}>
            <Button
              color={ButtonColor.Secondary}
              onClick={props.onClose}
              variant={ButtonVariant.Outline}
            >
              {t('general.cancel')}
            </Button>
          </div>
        </div>
      </Popover>
    </div>
  );
}
