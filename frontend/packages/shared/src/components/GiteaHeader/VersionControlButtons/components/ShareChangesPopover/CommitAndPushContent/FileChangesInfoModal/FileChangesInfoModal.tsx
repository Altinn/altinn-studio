import React from 'react';
import type { FileStatus, RepoContentStatus } from 'app-shared/types/RepoStatus';
import { StudioModal, StudioSpinner } from '@studio/components';
import { Alert, Heading, Table, Tag } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './FileChangesInfoModal.module.css';
import { ClockDashedIcon } from '@studio/icons';
import { FilePath } from './FilePath/FilePath';
import { useRepoDiffQuery } from 'app-shared/hooks/queries/useRepoDiffQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export interface FileChangesInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileChanges: RepoContentStatus[];
}

const fileStatusToTagColorMapping: { [key in FileStatus]: string } = {
  NewInWorkdir: 'success',
  DeletedFromWorkdir: 'danger',
  ModifiedInWorkdir: 'info',
  RenamedInWorkdir: 'neutral', // might not be relevant
};

export const FileChangesInfoModal = ({
  isOpen,
  onClose,
  fileChanges,
}: FileChangesInfoModalProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: repoDiff, status: repoDiffStatus } = useRepoDiffQuery(org, app);

  const gitDiffIncludesFile = (filePath: string): boolean =>
    repoDiffStatus === 'success' && Object.keys(repoDiff).includes(filePath);

  const renderModalHeading = (): React.ReactElement => {
    return (
      <div className={classes.headingWrapper}>
        <ClockDashedIcon className={classes.icon} />
        <Heading level={1} size='small'>
          {t('sync_header.show_changes_modal.title')}
        </Heading>
      </div>
    );
  };

  // TODO: Render RepoDiffStatus as a Modal.Footer when we update StudioModal using Modal from DS
  // Issue: https://github.com/Altinn/altinn-studio/issues/13269
  const renderRepoDiffStatus = (): React.ReactElement => {
    switch (repoDiffStatus) {
      case 'pending':
        return (
          <StudioSpinner
            spinnerTitle={t('sync_header.show_changes_modal.repo_diff_pending_title')}
            showSpinnerTitle
          />
        );
      case 'error':
        return (
          <Alert size='small' severity='danger'>
            {t('sync_header.show_changes_modal.repo_diff_error_title')}
          </Alert>
        );
    }
  };

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title={renderModalHeading()}
      closeButtonLabel={t('sync_header.show_changes_modal.close_button')}
    >
      <div className={classes.fileChangesContainer}>
        <Table stickyHeader zebra>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>
                <Heading size='xxsmall'>
                  {t('sync_header.show_changes_modal.column_header_file_name')}
                </Heading>
              </Table.HeaderCell>
              <Table.HeaderCell>
                <Heading size='xxsmall'>
                  {t('sync_header.show_changes_modal.column_header_file_status')}
                </Heading>
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
        {renderRepoDiffStatus()}
      </div>
    </StudioModal>
  );
};

interface FileChangeTableRowProps {
  fileChange: RepoContentStatus;
  diff?: string; // Might be null for deleted files
  repoDiffStatus: 'success' | 'error' | 'pending';
}

const FileChangeTableRow = ({ fileChange, diff, repoDiffStatus }: FileChangeTableRowProps) => {
  const { t } = useTranslation();

  const fileStatusTag: React.ReactElement => (
    <Tag size='small' color={fileStatusToTagColorMapping[fileChange.fileStatus]}>
      {t(`sync_header.show_changes_modal.file_status_${fileChange.fileStatus}`)}
    </Tag>
  );

  const enableFileDiff =
    fileChange.fileStatus === 'ModifiedInWorkdir' || fileChange.fileStatus === 'NewInWorkdir';

  return (
    <Table.Row key={fileChange.filePath}>
      <Table.Cell className={classes.filePath}>
        <FilePath
          enableFileDiff={enableFileDiff}
          filePath={fileChange.filePath}
          diff={diff}
          repoDiffStatus={repoDiffStatus}
        />
      </Table.Cell>
      <Table.Cell className={classes.fileStatus}>{renderFileStatusTag()}</Table.Cell>
    </Table.Row>
  );
};
