import React, { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Textfield, Paragraph } from '@digdir/design-system-react';
import classes from './RemoveChangesModal.module.css';
import { Modal } from 'resourceadm/components/Modal';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';
import { Trans } from 'react-i18next';

type RemoveChangesModalProps = {
  onClose: () => void;
  handleClickResetRepo: () => void;
  repo: string;
};

/**
 * @Component
 *    Content to be displayed inside the modal where the user removes their changes in a merge conflict
 *
 * @property {function}[onClose] - Function to handle close
 * @property {function}[handleClickResetRepo] - Function to be executed when the reset repo is clicked
 * @property {string}[repo] - The name of the repo
 *
 * @returns {JSX.Element} - The rendered component
 */
export const RemoveChangesModal = forwardRef<HTMLDialogElement, RemoveChangesModalProps>(
  ({ onClose, handleClickResetRepo, repo }, ref): JSX.Element => {
    const { t } = useTranslation();

    const [deleteRepoName, setDeleteRepoName] = useState('');

    const handleClose = () => {
      setDeleteRepoName('');
      onClose();
    };

    const handleDelete = () => {
      handleClose();
      handleClickResetRepo();
    };

    return (
      <Modal ref={ref} onClose={onClose} title={t('administration.reset_repo_confirm_heading')}>
        <Paragraph size='small'>
          <Trans
            i18nKey={'administration.reset_repo_confirm_info'}
            values={{ repositoryName: repo }}
            components={{ bold: <strong /> }}
          />
        </Paragraph>
        <div className={classes.textFieldWrapper}>
          <Textfield
            label={t('resourceadm.reset_repo_confirm_repo_name')}
            value={deleteRepoName}
            onChange={(e) => setDeleteRepoName(e.target.value)}
            aria-labelledby='delete-changes'
          />
          <ScreenReaderSpan
            id='delete-changes'
            label={t('resourceadm.reset_repo_confirm_repo_name')}
          />
        </div>
        <div className={classes.buttonWrapper}>
          <Button
            color='danger'
            aria-disabled={repo !== deleteRepoName}
            onClick={repo === deleteRepoName && handleDelete}
            variant='secondary'
            size='small'
          >
            {t('administration.reset_repo_button')}
          </Button>
          <Button color='second' onClick={handleClose} variant='secondary' size='small'>
            {t('general.cancel')}
          </Button>
        </div>
      </Modal>
    );
  },
);

RemoveChangesModal.displayName = 'RemoveChangesModal';
