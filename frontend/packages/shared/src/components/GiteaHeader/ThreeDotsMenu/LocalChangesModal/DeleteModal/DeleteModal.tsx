import React, { useState } from 'react';
import classes from './DeleteModal.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioModal, StudioSpinner } from '@studio/components';
import { TrashIcon } from '@studio/icons';
import { useResetRepositoryMutation } from 'app-development/hooks/mutations/useResetRepositoryMutation';
import { toast } from 'react-toastify';
import { Heading, Paragraph, Textfield } from '@digdir/designsystemet-react';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  const handleClose = () => {
    setNameToDelete('');
    onClose();
  };

  const handleDelete = () => {
    deleteLocalChanges(undefined, {
      onSuccess: () => {
        handleClose();
        toast.success(t('local_changes.modal_deleted_success'));
        queryClient.invalidateQueries();
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
      closeButtonLabel={t('local_changes.modal_close_delete_modal')}
    >
      <div className={classes.contentWrapper}>
        <Paragraph size='small' spacing>
          {t('local_changes.modal_delete_modal_text')}
        </Paragraph>
        <Textfield
          label={t('local_changes.modal_delete_modal_textfield_label')}
          description={t('local_changes.modal_delete_modal_textfield_description', {
            appName: app,
          })}
          size='small'
          value={nameToDelete}
          onChange={(e) => setNameToDelete(e.target.value)}
        />
        <div className={classes.buttonWrapper}>
          {isPendingDeleteLocalChanges ? (
            <StudioSpinner
              showSpinnerTitle={false}
              spinnerTitle={t('local_changes.modal_loading_delete_local_changes')}
            />
          ) : (
            <>
              <StudioButton
                variant='secondary'
                color='danger'
                onClick={handleDelete}
                disabled={app !== nameToDelete}
              >
                {t('local_changes.modal_confirm_delete_button')}
              </StudioButton>
              <StudioButton variant='secondary' onClick={handleClose}>
                {t('general.cancel')}
              </StudioButton>
            </>
          )}
        </div>
      </div>
    </StudioModal>
  );
};
