import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, LegacyTextField, Paragraph } from '@digdir/design-system-react';
import classes from './RemoveChangesModal.module.css';
import { Modal } from 'resourceadm/components/Modal';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';

type RemoveChangesModalProps = {
  /**
   * Boolean for if the modal is open
   */
  isOpen: boolean;
  /**
   * Function to handle close
   * @returns void
   */
  onClose: () => void;
  /**
   * Function to be executed when the reset repo is clicked
   * @returns void
   */
  handleClickResetRepo: () => void;
  /**
   * The name of the repo
   */
  repo: string;
};

/**
 * @Component
 *    Content to be displayed inside the modal where the user removes their changes in a merge conflict
 *
 * @property {boolean}[isOpen] - Boolean for if the modal is open
 * @property {function}[onClose] - Function to handle close
 * @property {function}[handleClickResetRepo] - Function to be executed when the reset repo is clicked
 * @property {string}[repo] - The name of the repo
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const RemoveChangesModal = ({
  isOpen,
  onClose,
  handleClickResetRepo,
  repo,
}: RemoveChangesModalProps): React.ReactNode => {
  const { t } = useTranslation();

  const [deleteRepoName, setDeleteRepoName] = useState('');

  /**
   * Handles the closing of the modal
   */
  const handleClose = () => {
    setDeleteRepoName('');
    onClose();
  };

  /**
   * Handles the deletion of the changes
   */
  const handleDelete = () => {
    handleClose();
    handleClickResetRepo();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('administration.reset_repo_confirm_heading')}>
      <Paragraph size='small'>
        {t('administration.reset_repo_confirm_info', { repositoryName: repo })}
      </Paragraph>
      <div className={classes.textFieldWrapper}>
        <LegacyTextField
          label='Skriv inn navn på repoet for å bekrefte'
          value={deleteRepoName}
          onChange={(e) => setDeleteRepoName(e.target.value)}
          aria-labelledby='delete-changes'
        />
        <ScreenReaderSpan id='delete-changes' label='Skriv inn navn på repoet for å bekrefte' />
      </div>
      <div className={classes.buttonWrapper}>
        <Button
          color='danger'
          aria-disabled={repo !== deleteRepoName}
          onClick={repo === deleteRepoName && handleDelete}
          variant='outline'
          size='small'
        >
          {t('administration.reset_repo_button')}
        </Button>
        <Button color='secondary' onClick={handleClose} variant='outline' size='small'>
          {t('general.cancel')}
        </Button>
      </div>
    </Modal>
  );
};
