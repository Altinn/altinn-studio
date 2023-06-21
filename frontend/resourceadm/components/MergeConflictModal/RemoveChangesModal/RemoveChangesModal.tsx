import React, { useState } from 'react';
import Modal from 'react-modal';
import { useTranslation } from 'react-i18next';
import { Button, TextField } from '@digdir/design-system-react';
import classes from './RemoveChangesModal.module.css';

/**
 * Style the modal
 */
const modalStyles = {
  content: {
    width: '400px',
    height: 'fit-content',
    margin: 'auto',
    paddingBlock: '40px',
    paddingInline: '70px',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  handleClickResetRepo: () => void;
  repo: string;
}

/**
 *
 * @param props.isOpen boolean for if the modal is open
 * @param props.onClose function to handle close
 * @param props.handleClickResetRepo function to be executed when the reset repo is clicked
 * @param props.repo the name of the repo
 */
export const RemoveChangesModal = ({ isOpen, onClose, handleClickResetRepo, repo }: Props) => {
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
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel='Remove Modal'
      style={modalStyles}
      ariaHideApp={false}
    >
      <h3 className={classes.modalHeader}>{t('administration.reset_repo_confirm_heading')}</h3>
      <p className={classes.bodyText}>
        {t('administration.reset_repo_confirm_info', { repositoryName: repo })}
      </p>
      <div className={classes.textFieldWrapper}>
        <TextField
          label='Skriv inn navn på repoet for å bekrefte'
          value={deleteRepoName}
          onChange={(e) => setDeleteRepoName(e.target.value)}
        />
      </div>
      <div className={classes.buttonWrapper}>
        <Button
          color='danger'
          data-testid='confirm-reset-repo-button'
          disabled={repo !== deleteRepoName}
          onClick={handleDelete}
          variant='outline'
        >
          {t('administration.reset_repo_button')}
        </Button>
        <Button color='secondary' onClick={handleClose} variant='outline'>
          {t('general.cancel')}
        </Button>
      </div>
    </Modal>
  );
};
