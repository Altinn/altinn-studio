import React from 'react';
import { Popover, Typography } from '@mui/material';
import { Button, ButtonVariant } from '@altinn/altinn-design-system';
import {
  getLanguageFromKey,
  getParsedLanguageFromKey,
} from 'app-shared/utils/language';
import classes from './RepoModal.module.css';

interface IDownloadRepoModalProps {
  anchorRef: React.MutableRefObject<Element>;
  onClose: any;
  open: boolean;
  language: any;
}

export function DownloadRepoModal(props: IDownloadRepoModalProps) {
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
          <Typography variant={'h2'}>
            {getLanguageFromKey(
              'administration.download_repo_heading',
              props.language,
            )}
          </Typography>
          <Typography variant='body1'>
            {getParsedLanguageFromKey(
              'administration.download_repo_info',
              props.language,
            )}
          </Typography>
          <Typography variant='body1'>
            <a
              href={`/designer/api/v1/repos/${(window as any).org}/${
                (window as any).app
              }/contents.zip`}
            >
              {getLanguageFromKey(
                'administration.download_repo_changes',
                props.language,
              )}
            </a>
          </Typography>
          <Typography variant='body1'>
            <a
              href={`/designer/api/v1/repos/${(window as any).org}/${
                (window as any).app
              }/contents.zip?full=true`}
            >
              {getLanguageFromKey(
                'administration.download_repo_full',
                props.language,
              )}
            </a>
          </Typography>
          <Button onClick={props.onClose} variant={ButtonVariant.Secondary}>
            {getLanguageFromKey('general.cancel', props.language)}
          </Button>
        </div>
      </Popover>
    </div>
  );
}
