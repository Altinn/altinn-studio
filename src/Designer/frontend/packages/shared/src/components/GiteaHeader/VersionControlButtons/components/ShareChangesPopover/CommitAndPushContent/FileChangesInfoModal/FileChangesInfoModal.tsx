import type { ReactNode } from 'react';
import React from 'react';
import type { FileStatus, RepoContentStatus } from 'app-shared/types/RepoStatus';
import {
  StudioError,
  StudioDialog,
  StudioHeading,
  StudioSpinner,
  StudioTag,
  StudioTable,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './FileChangesInfoModal.module.css';
import { ClockDashedIcon } from '@studio/icons';
import { FilePath } from './FilePath/FilePath';
import { useRepoDiffQuery } from 'app-shared/hooks/queries/useRepoDiffQuery';
import type { QueryStatus } from '@tanstack/react-query';
import { useGiteaHeaderContext } from 'app-shared/components/GiteaHeader/context/GiteaHeaderContext';

export interface FileChangesInfoModalProps {
  fileChanges: RepoContentStatus[];
}

const fileStatusToTagColorMapping: { [key in FileStatus]: string } = {
  NewInWorkdir: 'success',
  DeletedFromWorkdir: 'danger',
  ModifiedInWorkdir: 'info',
  RenamedInWorkdir: 'neutral', // might not be relevant
};

export const FileChangesInfoModal = ({
  fileChanges,
}: FileChangesInfoModalProps): React.ReactElement => {
  const { t } = useTranslation();
  const { owner, repoName } = useGiteaHeaderContext();
  const { data: repoDiff, status: repoDiffStatus } = useRepoDiffQuery(owner, repoName);

  const gitDiffIncludesFile = (filePath: string): boolean =>
    repoDiffStatus === 'success' && Object.keys(repoDiff).includes(filePath);

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
          <div>
            <StudioTable zebra className={classes.table}>
              <StudioTable.Head>
                <StudioTable.Row>
                  <StudioTable.HeaderCell>
                    {t('sync_header.show_changes_modal.column_header_file_name')}
                  </StudioTable.HeaderCell>
                  <StudioTable.HeaderCell className={classes.fileStatusCell}>
                    {t('sync_header.show_changes_modal.column_header_file_status')}
                  </StudioTable.HeaderCell>
                </StudioTable.Row>
              </StudioTable.Head>
              <StudioTable.Body>
                {fileChanges.map((fileChange) => (
                  <FileChangeTableRow
                    key={fileChange.filePath}
                    fileChange={fileChange}
                    diff={gitDiffIncludesFile(fileChange.filePath) && repoDiff[fileChange.filePath]}
                    repoDiffStatus={repoDiffStatus}
                  />
                ))}
              </StudioTable.Body>
            </StudioTable>
          </div>
        </StudioDialog.Block>
        {renderDiffStatus(repoDiffStatus) && (
          <StudioDialog.Block>{renderDiffStatus(repoDiffStatus)}</StudioDialog.Block>
        )}
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
};

const renderDiffStatus = (status: QueryStatus): ReactNode | undefined =>
  status === 'success' ? undefined : <DiffStatus status={status} />;

type DiffStatusProps = {
  status: QueryStatus;
};

const DiffStatus = ({ status }: DiffStatusProps) => {
  const { t } = useTranslation();
  switch (status) {
    case 'pending':
      return (
        <StudioSpinner
          spinnerTitle={t('sync_header.show_changes_modal.repo_diff_pending_title')}
          aria-hidden
        />
      );
    case 'error':
      return (
        <StudioError data-size='sm'>
          {t('sync_header.show_changes_modal.repo_diff_error_title')}
        </StudioError>
      );
    default:
      return null;
  }
};

interface FileChangeTableRowProps {
  fileChange: RepoContentStatus;
  diff?: string; // Null if diff not fetched successfully
  repoDiffStatus: 'success' | 'error' | 'pending';
}

const FileChangeTableRow = ({ fileChange, diff, repoDiffStatus }: FileChangeTableRowProps) => {
  const { filePath, fileStatus } = fileChange;
  const { t } = useTranslation();

  const fileStatusTag: React.ReactElement = (
    <StudioTag data-size='sm' color={fileStatusToTagColorMapping[fileStatus]}>
      {t(`sync_header.show_changes_modal.file_status_${fileStatus}`)}
    </StudioTag>
  );

  return (
    <StudioTable.Row key={filePath}>
      <StudioTable.Cell>
        <FilePath filePath={filePath} diff={diff} repoDiffStatus={repoDiffStatus} />
      </StudioTable.Cell>
      <StudioTable.Cell className={classes.fileStatusCell}>{fileStatusTag}</StudioTable.Cell>
    </StudioTable.Row>
  );
};
