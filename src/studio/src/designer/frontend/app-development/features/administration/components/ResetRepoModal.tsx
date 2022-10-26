import React, { useEffect, useState } from 'react';
import { Button, ButtonVariant, TextField } from '@altinn/altinn-design-system';
import { Popover, Typography } from '@mui/material';
import {
  getLanguageFromKey,
  getParsedLanguageFromKey,
} from 'app-shared/utils/language';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { useAppSelector } from 'common/hooks';
import classes from './RepoModal.module.css';

export interface IResetRepoModalProps {
  anchorRef: React.MutableRefObject<Element>;
  onClose: any;
  open: boolean;
  language: any;
  repositoryName: string;
  handleClickResetRepo: () => void;
}

export function ResetRepoModal(props: IResetRepoModalProps) {
  const [canDelete, setCanDelete] = useState<boolean>(false);
  const [deleteRepoName, setDeleteRepoName] = useState<string>('');

  const resetting: boolean = useAppSelector(
    (state) => state.repoStatus.resettingLocalRepo,
  );

  useEffect(() => {
    if (deleteRepoName === props.repositoryName) {
      setCanDelete(true);
    } else {
      setCanDelete(false);
    }
  }, [deleteRepoName, props.repositoryName]);

  const onDeleteRepoNameChange = (event: any) =>
    setDeleteRepoName(event.target.value);

  const onResetWrapper = () => {
    setCanDelete(false);
    props.handleClickResetRepo();
  };

  const onCloseWrapper = () => {
    setDeleteRepoName('');
    props.onClose();
  };
  return (
    <div data-testid='reset-repo-container'>
      <Popover
        open={props.open}
        anchorEl={props.anchorRef.current}
        onClose={onCloseWrapper}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        data-testid='reset-repo-popover'
      >
        <div className={classes.modalContainer}>
          <Typography variant='h2'>
            {getLanguageFromKey(
              'administration.reset_repo_confirm_heading',
              props.language,
            )}
          </Typography>
          <Typography variant='body1'>
            {getParsedLanguageFromKey(
              'administration.reset_repo_confirm_info',
              props.language,
              [props.repositoryName],
              true,
            )}
          </Typography>
          <label htmlFor='delete-repo-name'>
            <Typography variant='body1'>
              {getLanguageFromKey(
                'administration.reset_repo_confirm_repo_name',
                props.language,
              )}
            </Typography>
          </label>
          <TextField id='delete-repo-name' onChange={onDeleteRepoNameChange} />
          {resetting ? (
            <AltinnSpinner />
          ) : (
            <div className={classes.buttonContainer}>
              <Button
                onClick={onResetWrapper}
                id='confirm-reset-repo-button'
                disabled={!canDelete}
                variant={ButtonVariant.Cancel}
                data-testid='confirm-reset-repo-button'
              >
                {getLanguageFromKey(
                  'administration.reset_repo_button',
                  props.language,
                )}
              </Button>
              <Button
                onClick={onCloseWrapper}
                variant={ButtonVariant.Secondary}
              >
                {getLanguageFromKey('general.cancel', props.language)}
              </Button>
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
}
