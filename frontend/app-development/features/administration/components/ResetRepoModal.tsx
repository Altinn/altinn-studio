import React, { useEffect, useState } from 'react';
import classes from './RepoModal.module.css';
import { AltinnSpinner } from 'app-shared/components';
import { Button, TextField } from '@digdir/design-system-react';
import { Popover } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useResetRepositoryMutation } from 'app-development/hooks/mutations/useResetRepositoryMutation';

export interface IResetRepoModalProps {
  anchorRef: React.MutableRefObject<Element>;
  onClose: any;
  open: boolean;
  repositoryName: string;
  org: string;
}

export function ResetRepoModal(props: IResetRepoModalProps) {
  const [canDelete, setCanDelete] = useState<boolean>(false);
  const [deleteRepoName, setDeleteRepoName] = useState<string>('');

  useEffect(() => {
    if (deleteRepoName === props.repositoryName) {
      setCanDelete(true);
    } else {
      setCanDelete(false);
    }
  }, [deleteRepoName, props.repositoryName]);

  const onDeleteRepoNameChange = (event: any) => setDeleteRepoName(event.target.value);

  const repoResetMutation = useResetRepositoryMutation(props.org, props.repositoryName);
  const onResetWrapper = () => {
    setCanDelete(false);
    repoResetMutation.mutate();
  };

  const handleOnKeypressEnter = (event: any) => {
    if (event.key === 'Enter' && canDelete) {
      onResetWrapper();
    }
  };

  const onCloseWrapper = () => {
    setDeleteRepoName('');
    repoResetMutation.reset();
    props.onClose();
  };
  const { t } = useTranslation();
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
          {!repoResetMutation.isSuccess && (
            <>
              <div>
                {t('administration.reset_repo_confirm_info', {
                  repositoryName: props.repositoryName,
                })}
              </div>
              <label htmlFor='delete-repo-name'>
                <div>{t('administration.reset_repo_confirm_repo_name')}</div>
              </label>
              <TextField
                id='delete-repo-name'
                onChange={onDeleteRepoNameChange}
                autoFocus
                onKeyUp={handleOnKeypressEnter}
              />
            </>
          )}
          {repoResetMutation.isSuccess && (
            <>
              <div>
                {t('administration.reset_repo_completed', {
                  repositoryName: props.repositoryName,
                })}
              </div>
              <div className={classes.buttonContainer}>
                <Button color='secondary' onClick={onCloseWrapper} variant='outline' size='small'>
                  {t('general.close')}
                </Button>
              </div>
            </>
          )}
          {repoResetMutation.isLoading && <AltinnSpinner />}
          {!repoResetMutation.isLoading && !repoResetMutation.isSuccess && (
            <div className={classes.buttonContainer}>
              <Button
                color='danger'
                data-testid='confirm-reset-repo-button'
                disabled={!canDelete}
                id='confirm-reset-repo-button'
                onClick={onResetWrapper}
                variant='outline'
                size='small'
              >
                {t('administration.reset_repo_button')}
              </Button>
              <Button color='secondary' onClick={onCloseWrapper} variant='outline' size='small'>
                {t('general.cancel')}
              </Button>
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
}
