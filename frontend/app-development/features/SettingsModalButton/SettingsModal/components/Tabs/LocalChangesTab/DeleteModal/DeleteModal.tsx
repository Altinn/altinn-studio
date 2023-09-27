import React, { ReactNode, useState } from 'react';
import classes from './DeleteModal.module.css';
import { useTranslation } from 'react-i18next';
import { Modal } from 'app-shared/components/Modal';
import { TrashIcon } from '@navikt/aksel-icons';
import { Button, Heading, Paragraph, Textfield } from '@digdir/design-system-react';

export type DeleteModalProps = {
  /**
   * If the modal is open or not
   */
  isOpen: boolean;
  /**
   * Function to execute on close
   * @returns void
   */
  onClose: () => void;
  /**
   * Function to execute on click delete
   * @returns void
   */
  onDelete: () => void;
  /**
   * The name of the app to delete changes on
   */
  appName: string;
};

/**
 * @component
 *    Displays a Warning modal to the user to ensure they really want to
 *    do an action.
 *
 * @property {boolean}[isOpen] - If the modal is open or not
 * @property {function}[onClose] - Function to execute on close
 * @property {function}[onDelete] - Function to execute on click delete
 * @property {string}[appName] - The name of the app to delete changes on
 *
 * @returns {ReactNode} - The rendered component
 */
export const DeleteModal = ({
  isOpen,
  onClose,
  onDelete,
  appName,
}: DeleteModalProps): ReactNode => {
  const { t } = useTranslation();

  const [nameToDelete, setNameToDelete] = useState('');

  const handleClose = () => {
    setNameToDelete('');
    onClose();
  };

  const handleDelete = () => {
    setNameToDelete('');
    onDelete();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className={classes.titleWrapper}>
          <TrashIcon className={classes.modalIcon} />
          <Heading level={1} size='xsmall'>
            {t('settings_modal.local_changes_tab_delete_modal_title')}
          </Heading>
        </div>
      }
    >
      <div className={classes.contentWrapper}>
        <Paragraph size='small' spacing>
          {t('settings_modal.local_changes_tab_delete_modal_text')}
        </Paragraph>
        <Textfield
          label={t('settings_modal.local_changes_tab_delete_modal_textfield_label')}
          size='small'
          value={nameToDelete}
          onChange={(e) => setNameToDelete(e.target.value)}
        />
        <div className={classes.buttonWrapper}>
          <Button
            variant='outline'
            color='danger'
            onClick={handleDelete}
            disabled={appName !== nameToDelete}
            size='small'
          >
            {t('settings_modal.local_changes_tab_delete_modal_delete_button')}
          </Button>
          <Button variant='outline' onClick={handleClose} size='small'>
            {t('general.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
