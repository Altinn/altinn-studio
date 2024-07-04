import React from 'react';
import type { FileStatus, RepoContentStatus } from 'app-shared/types/RepoStatus';
import { StudioModal } from '@studio/components';
import { Heading, Table, Tag } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import classes from './FileChangesInfoModal.module.css';

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

  const renderFilePath = (filePath: string): React.ReactElement => {
    const fileName = filePath.split('/').pop() || '';
    const filePathWithoutName = filePath.slice(0, filePath.lastIndexOf('/' + fileName));
    return (
      <div className={classes.filePathContainer} title={filePath}>
        <div className={classes.filePath}>{filePathWithoutName}</div>
        {'/'}
        <strong>{fileName}</strong>
      </div>
    );
  };

  const renderFileStatusTag = (fileStatus: string): React.ReactElement => {
    return (
      <Tag size='medium' color={fileStatusToTagColorMapping[fileStatus]}>
        {t(`sync_header.show_changes_modal.file_status_${fileStatus}`)}
      </Tag>
    );
  };

  // Remember to add max-width and overflow handling of filePath --> always show filename at ending but leave out middle or first part of path?
  // Add scroll if too many files  -->  or pagination? Currently there is a scroll builtin for modal which is okay. But sticky header titles?
  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <Heading level={1} size='small'>
          {'Nye endringer siden du sist delte'}
        </Heading>
      }
      closeButtonLabel={'Lukk'}
    >
      <div className={classes.fileChangesContainer}>
        <Table size='medium' stickyHeader zebra>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>
                <Heading size='xxsmall'>{'Filnavn'}</Heading>
              </Table.HeaderCell>
              <Table.HeaderCell>
                <Heading size='xxsmall'>{'Status'}</Heading>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {fileChanges.map((fileChange) => {
              return (
                <Table.Row key={fileChange.filePath}>
                  <Table.Cell>{renderFilePath(fileChange.filePath)}</Table.Cell>
                  <Table.Cell>{renderFileStatusTag(fileChange.fileStatus)}</Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    </StudioModal>
  );
};
