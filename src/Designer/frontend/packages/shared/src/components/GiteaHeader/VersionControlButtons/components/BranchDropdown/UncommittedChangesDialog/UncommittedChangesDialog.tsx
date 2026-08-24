import { useTranslation, Trans } from 'react-i18next';
import {
  StudioDialog,
  StudioButton,
  StudioParagraph,
  StudioHeading,
  StudioAlert,
} from '@studio/components';
import type { UncommittedChangesError, UncommittedFile } from 'app-shared/types/api/BranchTypes';
import type { RepoContentStatus } from 'app-shared/types/RepoStatus';
import { FileChangesTable } from '../../FileChangesTable';
import classes from './UncommittedChangesDialog.module.css';

export interface UncommittedChangesDialogProps {
  error: UncommittedChangesError;
  onClose: () => void;
  onDiscardAndSwitch: (targetBranch: string) => void;
  isLoading: boolean;
}

export const UncommittedChangesDialog = ({
  error,
  onClose,
  onDiscardAndSwitch,
  isLoading,
}: UncommittedChangesDialogProps) => {
  const { t } = useTranslation();

  const handleDiscardAndSwitch = () => {
    if (!window.confirm(t('branching.uncommitted_changes_dialog.confirm_discard'))) {
      return;
    }

    onDiscardAndSwitch(error.targetBranch);
  };

  const discardButtonText = isLoading
    ? t('general.loading')
    : t('branching.uncommitted_changes_dialog.discard_and_switch');

  return (
    <StudioDialog
      open={true}
      onClose={onClose}
      data-color-scheme='light'
      className={classes.dialog}
    >
      <StudioDialog.Block>
        <StudioHeading>{t('branching.uncommitted_changes_dialog.heading')}</StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.dialogMainContent}>
        <StudioAlert data-color='warning'>
          <Trans
            i18nKey='branching.uncommitted_changes_dialog.alert'
            values={{ currentBranch: error.currentBranch, targetBranch: error.targetBranch }}
            components={{ strong: <strong /> }}
            shouldUnescape
          />
        </StudioAlert>
        <FileChangesTable
          fileChanges={mapUncommittedFilesToContentStatus(error.uncommittedFiles)}
        />

        <StudioParagraph>{t('branching.uncommitted_changes_dialog.choose_action')}</StudioParagraph>
        <div className={classes.buttons}>
          <StudioButton
            variant='secondary'
            color='danger'
            onClick={handleDiscardAndSwitch}
            disabled={isLoading}
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

const mapUncommittedFilesToContentStatus = (files: UncommittedFile[]): RepoContentStatus[] =>
  files.map((file) => ({ filePath: file.filePath, fileStatus: file.status }));
