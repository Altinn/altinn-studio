import type { ReactNode } from 'react';
import React from 'react';
import type { FileStatus, RepoContentStatus } from 'app-shared/types/RepoStatus';
import { StudioError, StudioModal, StudioSpinner } from 'libs/studio-components-legacy/src';
import { Table, Tag } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './FileChangesInfoModal.module.css';
import { ClockDashedIcon } from 'libs/studio-icons/src';
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
    <StudioModal.Root>
      <StudioModal.Trigger
        icon={<ClockDashedIcon />}
        variant='tertiary'
        className={classes.openDialogButton}
      >
        {t('sync_header.review_file_changes')}
      </StudioModal.Trigger>
      <StudioModal.Dialog
        className={classes.dialog}
        closeButtonTitle={t('sync_header.show_changes_modal.close_button')}
        footer={renderDiffStatus(repoDiffStatus)}
        heading={t('sync_header.show_changes_modal.title')}
        icon={<ClockDashedIcon />}
      >
        <div>
          <Table zebra className={classes.table}>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>
                  {t('sync_header.show_changes_modal.column_header_file_name')}
                </Table.HeaderCell>
                <Table.HeaderCell className={classes.fileStatusCell}>
                  {t('sync_header.show_changes_modal.column_header_file_status')}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {fileChanges.map((fileChange) => (
                <FileChangeTableRow
                  key={fileChange.filePath}
                  fileChange={fileChange}
                  diff={gitDiffIncludesFile(fileChange.filePath) && repoDiff[fileChange.filePath]}
                  repoDiffStatus={repoDiffStatus}
                />
              ))}
            </Table.Body>
          </Table>
        </div>
      </StudioModal.Dialog>
    </StudioModal.Root>
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
          showSpinnerTitle
        />
      );
    case 'error':
      return (
        <StudioError size='small'>
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
    <Tag size='small' color={fileStatusToTagColorMapping[fileStatus]}>
      {t(`sync_header.show_changes_modal.file_status_${fileStatus}`)}
    </Tag>
  );

  return (
    <Table.Row key={filePath}>
      <Table.Cell>
        <FilePath filePath={filePath} diff={diff} repoDiffStatus={repoDiffStatus} />
      </Table.Cell>
      <Table.Cell className={classes.fileStatusCell}>{fileStatusTag}</Table.Cell>
    </Table.Row>
  );
};
