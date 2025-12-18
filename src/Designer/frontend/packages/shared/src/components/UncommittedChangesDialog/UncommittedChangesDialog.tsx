import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  StudioDialog,
  StudioButton,
  StudioParagraph,
  StudioHeading,
  StudioAlert,
} from '@studio/components';
import { useCheckoutBranchMutation } from '../../hooks/mutations/useCheckoutBranchMutation';
import { useDiscardChangesMutation } from '../../hooks/mutations/useDiscardChangesMutation';
import type { UncommittedChangesError } from '../../types/api/BranchTypes';
import classes from './UncommittedChangesDialog.module.css';

export interface UncommittedChangesDialogProps {
  error: UncommittedChangesError;
  targetBranch: string;
  onClose: () => void;
  org: string;
  app: string;
}

export const UncommittedChangesDialog = ({
  error,
  targetBranch,
  onClose,
  org,
  app,
}: UncommittedChangesDialogProps) => {
  const { t } = useTranslation();

  const discardMutation = useDiscardChangesMutation(org, app, {
    onSuccess: () => {
      checkoutMutation.mutate(targetBranch);
    },
  });

  const checkoutMutation = useCheckoutBranchMutation(org, app, {
    onSuccess: () => {
      location.reload();
    },
  });

  const handleDiscardAndSwitch = () => {
    if (!window.confirm(t('branching.uncommitted_changes_dialog.confirm_discard'))) {
      return;
    }

    discardMutation.mutate();
  };

  const isProcessing = discardMutation.isPending || checkoutMutation.isPending;
  const discardButtonText = isProcessing
    ? t('branching.uncommitted_changes_dialog.discarding')
    : t('branching.uncommitted_changes_dialog.discard_and_switch');

  return (
    <StudioDialog open={true} onClose={onClose} data-color-scheme='light'>
      <StudioDialog.Block>
        <StudioHeading>{t('branching.uncommitted_changes_dialog.heading')}</StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.dialogMainContent}>
        <StudioAlert data-color='warning'>
          <Trans
            i18nKey='branching.uncommitted_changes_dialog.alert'
            values={{ currentBranch: error.currentBranch, targetBranch }}
            components={{ strong: <strong /> }}
            shouldUnescape
          />
        </StudioAlert>

        <div className={classes.fileList}>
          <StudioHeading level={4}>
            {t('branching.uncommitted_changes_dialog.uncommitted_files', {
              count: error.uncommittedFiles.length,
            })}
          </StudioHeading>
          <ul className={classes.files}>
            {error.uncommittedFiles.map((file) => (
              <li key={file.filePath}>
                <span className={classes.fileName}>{file.filePath}</span>
                <span className={classes.fileStatus}>{file.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <StudioParagraph>{t('branching.uncommitted_changes_dialog.choose_action')}</StudioParagraph>

        <div className={classes.buttons}>
          <StudioButton
            variant='secondary'
            color='danger'
            onClick={handleDiscardAndSwitch}
            disabled={isProcessing}
          >
            {discardButtonText}
          </StudioButton>
          <StudioButton variant='secondary' onClick={onClose}>
            {t('branching.uncommitted_changes_dialog.cancel')}
          </StudioButton>
        </div>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
