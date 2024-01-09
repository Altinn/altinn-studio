import React, { ReactNode, useState } from 'react';
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

/**
 * @component
 *    Displays a Warning modal to the user to ensure they really want to
 *    do an action.
 *
 * @property {boolean}[isOpen] - If the modal is open or not
 * @property {function}[onClose] - Function to execute on close
 * @property {string}[app] - The app
 * @property {string}[org] - The org
 *
 * @returns {ReactNode} - The rendered component
 */
export const DeleteModal = ({ isOpen, onClose, app, org }: DeleteModalProps): ReactNode => {
  const { t } = useTranslation();

  const { mutate: deleteLocalChanges } = useResetRepositoryMutation(org, app);

  const [nameToDelete, setNameToDelete] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setNameToDelete('');
    onClose();
  };

  const reset = () => {
    setIsLoading(false);
    setNameToDelete('');
    onClose();
  };

  const handleDelete = () => {
    setIsLoading(true);
    deleteLocalChanges(undefined, {
      onSuccess: () => {
        reset();
        toast.success(t('settings_modal.local_changes_tab_deleted_success'));
      },
      onError: () => setIsLoading(false),
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
            {t('settings_modal.local_changes_tab_delete_modal_title')}
          </Heading>
        </div>
      }
    >
      <div className={classes.contentWrapper}>
        {isLoading ? (
          <StudioSpinner />
        ) : (
          <>
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
                variant='secondary'
                color='danger'
                onClick={handleDelete}
                disabled={app !== nameToDelete}
                size='small'
              >
                {t('settings_modal.local_changes_tab_delete_modal_delete_button')}
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
