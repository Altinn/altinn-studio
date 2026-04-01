import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components';
import { TrashIcon } from '@studio/icons';
import classes from './DeleteBranchDialog.module.css';

export interface DeleteBranchDialogProps {
  branchName: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (branchName: string) => void;
}

export const DeleteBranchDialog = ({
  branchName,
  isOpen,
  onClose,
  onDelete,
}: DeleteBranchDialogProps) => {
  const { t } = useTranslation();
  const [confirmationInput, setConfirmationInput] = useState('');

  const isBranchNameConfirmed = confirmationInput === branchName;

  const handleClose = () => {
    setConfirmationInput('');
    onClose();
  };

  const handleDelete = () => {
    onDelete(branchName);
    onClose();
  };

  return (
    <StudioDialog open={isOpen} onClose={handleClose} data-color-scheme='light'>
      <StudioDialog.Block>
        <StudioHeading className={classes.heading}>
          <TrashIcon />
          {t('branching.delete_branch_dialog.title')}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.dialogMainContent}>
        <StudioParagraph>
          <Trans
            i18nKey='branching.delete_branch_dialog.description'
            values={{ branchName }}
            components={{ strong: <strong /> }}
            shouldUnescape
          />
        </StudioParagraph>
        <StudioTextfield
          label={t('branching.delete_branch_dialog.textfield_label')}
          description={t('branching.delete_branch_dialog.textfield_description')}
          value={confirmationInput}
          onChange={(e) => setConfirmationInput(e.target.value)}
        />
        <div className={classes.buttons}>
          <StudioButton
            variant='secondary'
            data-color='danger'
            onClick={handleDelete}
            disabled={!isBranchNameConfirmed}
            icon={<TrashIcon />}
          >
            {t('general.delete')}
          </StudioButton>
          <StudioButton variant='secondary' onClick={handleClose}>
            {t('general.cancel')}
          </StudioButton>
        </div>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
