import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioSpinner,
  StudioTextfield,
} from '@studio/components';
import { TrashIcon } from '@studio/icons';
import { useDeleteBranchMutation } from 'app-shared/hooks/mutations/useDeleteBranchMutation';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import classes from './DeleteBranchDialog.module.css';

export interface DeleteBranchDialogProps {
  branchName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteBranchDialog = ({ branchName, isOpen, onClose }: DeleteBranchDialogProps) => {
  const { t } = useTranslation();
  const { owner: org, repoName: app } = useGiteaHeaderContext();
  const [confirmationInput, setConfirmationInput] = useState('');

  const { mutate: deleteBranch, isPending } = useDeleteBranchMutation(org, app);

  const isBranchNameConfirmed = confirmationInput === branchName;

  const handleClose = () => {
    setConfirmationInput('');
    onClose();
  };

  const handleDelete = () => {
    deleteBranch(branchName, {
      onSuccess: handleClose,
    });
  };

  return (
    <StudioDialog open={isOpen} onClose={handleClose} data-color-scheme='light'>
      <StudioDialog.Block>
        <StudioHeading className={classes.heading}>
          <TrashIcon className={classes.headingIcon} />
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
          disabled={isPending}
        />
        <div className={classes.buttons}>
          {isPending ? (
            <StudioSpinner aria-hidden spinnerTitle={t('branching.delete_branch_dialog.loading')} />
          ) : (
            <>
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
            </>
          )}
        </div>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
