import React, { forwardRef, useState } from 'react';
import classes from './DeleteModal.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioModal, StudioSpinner } from '@studio/components';
import { useForwardedRef } from '@studio/hooks';
import { TrashIcon } from '@studio/icons';
import { useResetRepositoryMutation } from 'app-shared/hooks/mutations/useResetRepositoryMutation';
import { toast } from 'react-toastify';
import { Paragraph, Textfield } from '@digdir/designsystemet-react';
import { useQueryClient } from '@tanstack/react-query';

export type DeleteModalProps = {
  org: string;
  app: string;
  onDelete: () => void;
};

export const DeleteModal = forwardRef<HTMLDialogElement, DeleteModalProps>(
  ({ app, org, onDelete }, ref): JSX.Element => {
    const { t } = useTranslation();
    const dialogRef = useForwardedRef<HTMLDialogElement>(ref);

    const { mutate: deleteLocalChanges, isPending: isPendingDeleteLocalChanges } =
      useResetRepositoryMutation(org, app);

    const [nameToDelete, setNameToDelete] = useState('');
    const queryClient = useQueryClient();

    const closeDialog = () => {
      dialogRef.current?.close();
      handleClose();
    };

    const handleClose = () => {
      setNameToDelete('');
    };

    const handleDelete = () => {
      deleteLocalChanges(undefined, {
        onSuccess: async () => {
          closeDialog();
          onDelete();
          toast.success(t('local_changes.modal_deleted_success'));
          await queryClient.invalidateQueries();
        },
      });
    };

    return (
      <StudioModal.Dialog
        closeButtonTitle={t('local_changes.modal_close_delete_modal')}
        heading={t('local_changes.modal_delete_modal_title')}
        icon={<TrashIcon />}
        onClose={handleClose}
        ref={dialogRef}
      >
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
              <StudioButton variant='secondary' onClick={closeDialog}>
                {t('general.cancel')}
              </StudioButton>
            </>
          )}
        </div>
      </StudioModal.Dialog>
    );
  },
);

DeleteModal.displayName = 'DeleteModal';
