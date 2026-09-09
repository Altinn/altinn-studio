import React from 'react';
import type { RepoContentStatus } from 'app-shared/types/RepoStatus';
import { StudioDialog, StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './FileChangesInfoModal.module.css';
import { ClockDashedIcon } from '@studio/icons';
import { FileChangesTable } from '../../../FileChangesTable';

export interface FileChangesInfoModalProps {
  fileChanges: RepoContentStatus[];
}

export const FileChangesInfoModal = ({
  fileChanges,
}: FileChangesInfoModalProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger
        icon={<ClockDashedIcon />}
        variant='tertiary'
        className={classes.openDialogButton}
      >
        {t('sync_header.review_file_changes')}
      </StudioDialog.Trigger>
      <StudioDialog className={classes.dialog} closedby='any'>
        <StudioDialog.Block>
          <StudioHeading level={2}>
            <ClockDashedIcon /> {t('sync_header.show_changes_modal.title')}
          </StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <FileChangesTable fileChanges={fileChanges} />
        </StudioDialog.Block>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
};
