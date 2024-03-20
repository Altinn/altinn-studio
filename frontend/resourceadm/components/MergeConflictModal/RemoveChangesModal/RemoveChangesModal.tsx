import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Textfield, Paragraph } from '@digdir/design-system-react';
import classes from './RemoveChangesModal.module.css';
import { Modal } from '../../../components/Modal';
import { StudioButton } from '@studio/components';

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
 * @returns {React.JSX.Element} - The rendered component
 */
export const RemoveChangesModal = ({
  isOpen,
  onClose,
  handleClickResetRepo,
  repo,
}: RemoveChangesModalProps): React.JSX.Element => {
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
    <Modal isOpen={isOpen} onClose={onClose} title={t('local_changes.modal_delete_modal_title')}>
      <Paragraph size='small'>
        <Trans
          i18nKey={'overview.reset_repo_confirm_info'}
          values={{ repositoryName: repo }}
          components={{ bold: <strong /> }}
        />
      </Paragraph>
      <div className={classes.textFieldWrapper}>
        <Textfield
          label={t('resourceadm.reset_repo_confirm_repo_name')}
          value={deleteRepoName}
          onChange={(e) => setDeleteRepoName(e.target.value)}
        />
      </div>
      <div className={classes.buttonWrapper}>
        <StudioButton
          color='danger'
          aria-disabled={repo !== deleteRepoName}
          onClick={repo === deleteRepoName && handleDelete}
          variant='secondary'
          size='small'
        >
          {t('local_changes.modal_confirm_delete_button')}
        </StudioButton>
        <StudioButton color='second' onClick={handleClose} variant='secondary' size='small'>
          {t('general.cancel')}
        </StudioButton>
      </div>
    </Modal>
  );
};
