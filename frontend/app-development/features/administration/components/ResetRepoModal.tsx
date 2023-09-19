import React, { useEffect, useState } from 'react';
import classes from './RepoModal.module.css';
import { AltinnSpinner } from 'app-shared/components';
import { Button, TextField } from '@digdir/design-system-react';
import { Popover } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useResetRepositoryMutation } from 'app-development/hooks/mutations/useResetRepositoryMutation';
import * as testids from '../../../../testing/testids';
import { toast } from 'react-toastify';

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
    repoResetMutation.mutate(undefined, {
      onSuccess: () => {
        onCloseWrapper();
        toast.success(t('administration.reset_repo_completed'));
      },
    });
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
    <div data-testid={testids.resetRepoContainer}>
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
      >
        <div className={classes.modalContainer}>
          <h2>{t('administration.reset_repo_confirm_heading')}</h2>
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
          {repoResetMutation.isLoading && <AltinnSpinner />}
          {!repoResetMutation.isLoading && (
            <div className={classes.buttonContainer}>
              <Button
                color='danger'
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
