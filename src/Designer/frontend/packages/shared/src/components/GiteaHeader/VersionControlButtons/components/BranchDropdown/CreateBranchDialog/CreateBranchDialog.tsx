import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioDialog,
  StudioButton,
  StudioTextfield,
  StudioParagraph,
  StudioHeading,
} from '@studio/components';
import classes from './CreateBranchDialog.module.css';
import { BranchNameValidator } from 'app-shared/utils/BranchNameValidator';

export interface CreateBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBranch: (name: string) => void;
  currentBranch: string;
  existingBranchNames: string[];
  createError: string;
  isLoading: boolean;
}

export const CreateBranchDialog = ({
  isOpen,
  onClose,
  onCreateBranch,
  currentBranch,
  existingBranchNames,
  createError,
  isLoading,
}: CreateBranchDialogProps) => {
  const { t } = useTranslation();
  const [newBranchName, setNewBranchName] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleClose = () => {
    setNewBranchName('');
    setValidationError('');
    onClose();
  };

  const handleNameChange = (name: string) => {
    setNewBranchName(name);
    const validationResult = BranchNameValidator.validate(name, existingBranchNames);
    setValidationError(validationResult.isValid ? '' : t(validationResult.errorKey));
  };

  const createButtonText = isLoading
    ? t('general.loading')
    : t('branching.new_branch_dialog.create');

  const isCreateButtonEnabled = Boolean(newBranchName) && !validationError && !isLoading;

  return (
    <StudioDialog open={isOpen} onClose={handleClose} data-color-scheme='light'>
      <StudioDialog.Block>
        <StudioHeading>{t('branching.new_branch_dialog.create')}</StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.dialogMainContent}>
        <StudioParagraph>
          <Trans
            i18nKey='branching.new_branch_dialog.description'
            values={{ currentBranch }}
            components={{ strong: <strong /> }}
            shouldUnescape
          />
        </StudioParagraph>
        <StudioTextfield
          label={t('branching.new_branch_dialog.branch_name_label')}
          value={newBranchName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={t('branching.new_branch_dialog.branch_name_placeholder')}
          error={validationError || createError}
          disabled={isLoading}
        />
        <StudioParagraph>{t('branching.new_branch_dialog.hint')}</StudioParagraph>
        <div className={classes.buttons}>
          <StudioButton
            onClick={() => onCreateBranch(newBranchName)}
            disabled={!isCreateButtonEnabled}
          >
            {createButtonText}
          </StudioButton>
          <StudioButton variant='secondary' onClick={handleClose}>
            {t('general.cancel')}
          </StudioButton>
        </div>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
