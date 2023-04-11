import React, { useEffect, useState } from 'react';
import classes from './RepoModal.module.css';
import { AltinnSpinner } from 'app-shared/components';
import { Button, ButtonColor, ButtonVariant, TextField } from '@digdir/design-system-react';
import { Popover } from '@mui/material';
import { useAppSelector } from '../../../common/hooks';
import { useTranslation } from 'react-i18next';

export interface IResetRepoModalProps {
  anchorRef: React.MutableRefObject<Element>;
  onClose: any;
  open: boolean;
  repositoryName: string;
  handleClickResetRepo: () => void;
}

export function ResetRepoModal(props: IResetRepoModalProps) {
  const [canDelete, setCanDelete] = useState<boolean>(false);
  const [deleteRepoName, setDeleteRepoName] = useState<string>('');

  const resetting: boolean = useAppSelector((state) => state.repoStatus.resettingLocalRepo);

  useEffect(() => {
    if (deleteRepoName === props.repositoryName) {
      setCanDelete(true);
    } else {
      setCanDelete(false);
    }
  }, [deleteRepoName, props.repositoryName]);

  const onDeleteRepoNameChange = (event: any) => setDeleteRepoName(event.target.value);

  const onResetWrapper = () => {
    setCanDelete(false);
    props.handleClickResetRepo();
    onCloseWrapper();
  };

  const onCloseWrapper = () => {
    setDeleteRepoName('');
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
          <div>
            {t(
              'administration.reset_repo_confirm_info',
              { repositoryName: props.repositoryName },
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
                color={ButtonColor.Danger}
                data-testid='confirm-reset-repo-button'
                disabled={!canDelete}
                id='confirm-reset-repo-button'
                onClick={onResetWrapper}
                variant={ButtonVariant.Outline}
              >
                {t('administration.reset_repo_button')}
              </Button>
              <Button
                color={ButtonColor.Secondary}
                onClick={onCloseWrapper}
                variant={ButtonVariant.Outline}
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
