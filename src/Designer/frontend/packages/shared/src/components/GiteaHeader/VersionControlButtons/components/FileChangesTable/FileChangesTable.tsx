import type { ReactElement, ReactNode } from 'react';
import type { FileStatus, RepoContentStatus } from 'app-shared/types/RepoStatus';
import { StudioError, StudioSpinner, StudioTag, StudioTable } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './FileChangesTable.module.css';
import { FilePath } from './FilePath/FilePath';
import { useRepoDiffQuery } from 'app-shared/hooks/queries/useRepoDiffQuery';
import type { QueryStatus } from '@tanstack/react-query';
import { useGiteaHeaderContext } from 'app-shared/components/GiteaHeader/context/GiteaHeaderContext';

export interface FileChangesTableProps {
  fileChanges: RepoContentStatus[];
}

const fileStatusToTagColorMapping: { [key in FileStatus]: string } = {
  NewInWorkdir: 'success',
  DeletedFromWorkdir: 'danger',
  ModifiedInWorkdir: 'info',
  RenamedInWorkdir: 'neutral',
};

export const FileChangesTable = ({ fileChanges }: FileChangesTableProps): ReactElement => {
  const { t } = useTranslation();
  const { owner, repoName } = useGiteaHeaderContext();
  const { data: repoDiff, status: repoDiffStatus } = useRepoDiffQuery(owner, repoName);

  return (
    <>
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
              diff={repoDiff?.[fileChange.filePath]}
              repoDiffStatus={repoDiffStatus}
            />
          ))}
        </StudioTable.Body>
      </StudioTable>
      {renderDiffStatus(repoDiffStatus)}
    </>
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
  diff?: string;
  repoDiffStatus: 'success' | 'error' | 'pending';
}

const FileChangeTableRow = ({ fileChange, diff, repoDiffStatus }: FileChangeTableRowProps) => {
  const { filePath, fileStatus } = fileChange;
  const { t } = useTranslation();

  const fileStatusTag: ReactElement = (
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
