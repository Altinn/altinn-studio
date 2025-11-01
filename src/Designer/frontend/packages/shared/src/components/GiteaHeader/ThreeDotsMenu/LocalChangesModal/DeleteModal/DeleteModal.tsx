import React, { forwardRef, useState } from 'react';
import classes from './DeleteModal.module.css';
import { useTranslation } from 'react-i18next';
import { StudioSpinner, StudioTextfield } from '@studio/components-legacy';
import { StudioButton, StudioDialog, StudioHeading } from '@studio/components';
import { useForwardedRef } from '@studio/hooks';
import { TrashIcon } from '@studio/icons';
import { useResetRepositoryMutation } from 'app-shared/hooks/mutations/useResetRepositoryMutation';
import { Paragraph } from '@digdir/designsystemet-react';

export type DeleteModalProps = {
  org: string;
  app: string;
};

export const DeleteModal = forwardRef<HTMLDialogElement, DeleteModalProps>(
  ({ app, org }, ref): JSX.Element => {
    const { t } = useTranslation();
    const dialogRef = useForwardedRef<HTMLDialogElement>(ref);

    const { mutate: deleteLocalChanges, isPending: isPendingDeleteLocalChanges } =
      useResetRepositoryMutation(org, app);

    const [nameToDelete, setNameToDelete] = useState('');

    const closeDialog = () => {
      dialogRef.current?.close();
      handleClose();
    };

    const handleClose = () => {
      setNameToDelete('');
    };

    const handleDelete = () => {
      deleteLocalChanges(undefined, {
        onSuccess: async () => location.reload(),
      });
    };

    return (
      <StudioDialog onClose={handleClose} ref={dialogRef}>
        <StudioDialog.Block>
          <StudioHeading className={classes.headerWrapper} level={2}>
            <TrashIcon className={classes.trashIcon} />
            {t('local_changes.modal_delete_modal_title')}
          </StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <Paragraph size='small' spacing>
            {t('local_changes.modal_delete_modal_text')}
          </Paragraph>
          <StudioTextfield
            label={t('local_changes.modal_delete_modal_textfield_label')}
            description={t('local_changes.modal_delete_modal_textfield_description', {
              appName: app,
            })}
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
                  data-color='danger'
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
        </StudioDialog.Block>
      </StudioDialog>
    );
  },
);

DeleteModal.displayName = 'DeleteModal';
