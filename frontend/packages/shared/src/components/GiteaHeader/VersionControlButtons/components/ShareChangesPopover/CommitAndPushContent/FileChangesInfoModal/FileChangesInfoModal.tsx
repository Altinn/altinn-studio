import React from 'react';
import type { FileStatus, RepoContentStatus } from 'app-shared/types/RepoStatus';
import { StudioModal } from '@studio/components';
import { Heading, Table, Tag } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './FileChangesInfoModal.module.css';
import { ClockDashedIcon } from '@studio/icons';
import { FilePath } from './FilePath/FilePath';

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

  const renderFileStatusTag = (fileStatus: string): React.ReactElement => {
    return (
      <Tag size='small' color={fileStatusToTagColorMapping[fileStatus]}>
        {t(`sync_header.show_changes_modal.file_status_${fileStatus}`)}
      </Tag>
    );
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
            {fileChanges.map((fileChange) => {
              const enableFileDiff =
                fileChange.fileStatus === 'ModifiedInWorkdir' ||
                fileChange.fileStatus === 'NewInWorkdir';
              return (
                <Table.Row key={fileChange.filePath}>
                  <Table.Cell className={classes.filePath}>
                    <FilePath enableFileDiff={enableFileDiff} filePath={fileChange.filePath} />
                  </Table.Cell>
                  <Table.Cell className={classes.fileStatus}>
                    {renderFileStatusTag(fileChange.fileStatus)}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    </StudioModal>
  );
};
