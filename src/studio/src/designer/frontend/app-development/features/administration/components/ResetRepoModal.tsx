import React, { useEffect, useState } from 'react';
import { Button, ButtonVariant, TextField } from '@altinn/altinn-design-system';
import { Popover } from '@mui/material';
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
  const t = (key: string) => getLanguageFromKey(key, props.language);
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
          <h2>{t('administration.reset_repo_confirm_heading')}</h2>
          <div>
            {getParsedLanguageFromKey(
              'administration.reset_repo_confirm_info',
              props.language,
              [props.repositoryName],
              true,
            )}
          </div>
          <label htmlFor='delete-repo-name'>
            <div>{t('administration.reset_repo_confirm_repo_name')}</div>
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
                {t('administration.reset_repo_button')}
              </Button>
              <Button
                onClick={onCloseWrapper}
                variant={ButtonVariant.Secondary}
              >
                {t('general.cancel')}
              </Button>
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
}
