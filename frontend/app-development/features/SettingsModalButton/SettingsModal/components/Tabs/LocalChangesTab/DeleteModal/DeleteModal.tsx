import React, { ReactNode, useState } from 'react';
import classes from './DeleteModal.module.css';
import { useTranslation } from 'react-i18next';
import { Modal } from 'app-shared/components/Modal';
import { TrashIcon } from '@navikt/aksel-icons';
import { Button, Heading, Paragraph, TextField } from '@digdir/design-system-react';

export type DeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  appName: string;
};

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
        <Paragraph size='small' className={classes.paragraph}>
          {t('settings_modal.local_changes_tab_delete_modal_text')}
        </Paragraph>
        <TextField
          label={t('settings_modal.local_changes_tab_delete_modal_textfield_label')}
          value={nameToDelete}
          onChange={(e) => setNameToDelete(e.target.value)}
        />
        <div className={classes.buttonWrapper}>
          <Button
            variant='outline'
            color='danger'
            onClick={onDelete}
            disabled={appName !== nameToDelete}
            size='small'
          >
            {t('settings_modal.local_changes_tab_delete_modal_delete_button')}
          </Button>
          <Button
            variant='outline'
            onClick={handleClose}
            className={classes.cancelButton}
            size='small'
          >
            {t('general.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
