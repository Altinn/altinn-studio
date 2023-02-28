import React from 'react';
import { Popover } from '@mui/material';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import classes from './RepoModal.module.css';
import { useParams } from 'react-router-dom';
import { repoDownloadPath } from 'app-shared/api-paths';
import { Trans, useTranslation } from 'react-i18next';

interface IDownloadRepoModalProps {
  anchorRef: React.MutableRefObject<Element>;
  onClose: any;
  open: boolean;
}

export function DownloadRepoModal(props: IDownloadRepoModalProps) {
  const { org, app } = useParams();
  const { t } = useTranslation();
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
          <p>
            <Trans i18nKey={'administration.download_repo_info'} />
          </p>
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
