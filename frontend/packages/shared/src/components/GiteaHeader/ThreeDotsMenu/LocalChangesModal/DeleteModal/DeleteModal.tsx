import React, { useState } from 'react';
import classes from './DeleteModal.module.css';
import { useTranslation } from 'react-i18next';
import { StudioModal, StudioSpinner } from '@studio/components';
import { TrashIcon } from '@navikt/aksel-icons';
import { Button, Heading, Paragraph, Textfield } from '@digdir/design-system-react';
import { useResetRepositoryMutation } from 'app-development/hooks/mutations/useResetRepositoryMutation';
import { toast } from 'react-toastify';

export type DeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  org: string;
  app: string;
};

export const DeleteModal = ({ isOpen, onClose, app, org }: DeleteModalProps): JSX.Element => {
  const { t } = useTranslation();

  const { mutate: deleteLocalChanges, isPending: isPendingDeleteLocalChanges } =
    useResetRepositoryMutation(org, app);

  const [nameToDelete, setNameToDelete] = useState('');

  const handleClose = () => {
    setNameToDelete('');
    onClose();
  };

  const handleDelete = () => {
    deleteLocalChanges(undefined, {
      onSuccess: () => {
        handleClose();
        toast.success(t('local_changes.modal_deleted_success'));
      },
    });
  };

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className={classes.titleWrapper}>
          <TrashIcon className={classes.modalIcon} />
          <Heading level={1} size='xsmall'>
            {t('local_changes.modal_delete_modal_title')}
          </Heading>
        </div>
      }
    >
      <div className={classes.contentWrapper}>
        {isPendingDeleteLocalChanges ? (
          <StudioSpinner />
        ) : (
          <>
            <Paragraph size='small' spacing>
              {t('local_changes.modal_delete_modal_text')}
            </Paragraph>
            <Textfield
              label={t('local_changes.modal_delete_modal_textfield_label', { appName: app })}
              size='small'
              value={nameToDelete}
              onChange={(e) => setNameToDelete(e.target.value)}
            />
            <div className={classes.buttonWrapper}>
              <Button
                variant='secondary'
                color='danger'
                onClick={handleDelete}
                disabled={app !== nameToDelete}
                size='small'
              >
                {t('local_changes.modal_confirm_delete_button')}
              </Button>
              <Button variant='secondary' onClick={handleClose} size='small'>
                {t('general.cancel')}
              </Button>
            </div>
          </>
        )}
      </div>
    </StudioModal>
  );
};
