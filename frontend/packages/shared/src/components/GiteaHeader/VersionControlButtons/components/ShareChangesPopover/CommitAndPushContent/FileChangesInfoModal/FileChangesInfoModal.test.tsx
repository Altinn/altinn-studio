import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { FileChangesInfoModalProps } from './FileChangesInfoModal';
import { FileChangesInfoModal } from './FileChangesInfoModal';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const fileNameMock = 'fileName.json';
const filePathWithoutNameMock = 'mock/file/path/to';
const filePathMock = `${filePathWithoutNameMock}/${fileNameMock}`;
const fileStatusMock = 'ModifiedInWorkdir';
const someDiffContent = '@@ -2,6 +2,30 @@\n- old line\n+ new line';
const repoDiffMock = {
  'mock/file/path/to/fileName.json': someDiffContent,
  'mock/file/path/to/addedFile.json': someDiffContent,
};
const mockGetRepoDiff = jest.fn();
const mockOnClose = jest.fn();
const defaultProps: FileChangesInfoModalProps = {
  isOpen: true,
  onClose: mockOnClose,
  fileChanges: [
    {
      filePath: filePathMock,
      fileStatus: fileStatusMock,
    },
  ],
};

describe('FileChangesInfoModal', () => {
  afterEach(jest.clearAllMocks);

  it('should render the modal with a table of filePath and fileStatus columns', () => {
    renderFileChangesInfoModal();
    const fileChangesModalHeader = screen.getByRole('heading', {
      name: textMock('sync_header.show_changes_modal.title'),
      level: 1,
    });
    expect(fileChangesModalHeader).toBeInTheDocument();

    const tableHeaderFileName = screen.getByRole('columnheader', {
      name: textMock('sync_header.show_changes_modal.column_header_file_name'),
    });
    expect(tableHeaderFileName).toBeInTheDocument();

    const tableHeaderFileStatus = screen.getByRole('columnheader', {
      name: textMock('sync_header.show_changes_modal.column_header_file_status'),
    });
    expect(tableHeaderFileStatus).toBeInTheDocument();
  });

  it('should render headers of table as sticky', () => {
    renderFileChangesInfoModal();
    const table = screen.getByRole('table');

    expect(table).toHaveClass('fds-table--sticky-header');
  });

  it('should render the filePath and fileStatus correct', () => {
    renderFileChangesInfoModal();
    const filePathToolTip = screen.getByTitle(filePathMock);
    expect(filePathToolTip).toBeInTheDocument();

    const filePathWithoutNameElement = screen.getByText(filePathWithoutNameMock);
    expect(filePathWithoutNameElement).toBeInTheDocument();

    const fileNameElement = screen.getByText(fileNameMock, { selector: 'strong' });
    expect(fileNameElement).toBeInTheDocument();

    const tableCellFileStatus = screen.getByRole('cell', {
      name: textMock(`sync_header.show_changes_modal.file_status_${fileStatusMock}`),
    });
    expect(tableCellFileStatus).toBeInTheDocument();
  });

  it('should call onClose when closing modal', async () => {
    const user = userEvent.setup();
    renderFileChangesInfoModal();
    const closeModalButton = screen.getByRole('button', {
      name: textMock('sync_header.show_changes_modal.close_button'),
    });
    await user.click(closeModalButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render filePath as clickable when fileStatus is ModifiedInWorkdir or NewInWorkdir, but not DeletedFromWorkdir', async () => {
    const user = userEvent.setup();
    const addedFilePath = `${filePathWithoutNameMock}/addedFile.json`;
    const deletedFilePath = `${filePathWithoutNameMock}/deletedFile.json`;
    await renderFileChangesInfoModalAndWaitForData({
      ...defaultProps,
      fileChanges: [
        {
          filePath: filePathMock,
          fileStatus: fileStatusMock,
        },
        {
          filePath: addedFilePath,
          fileStatus: 'NewInWorkdir',
        },
        {
          filePath: deletedFilePath,
          fileStatus: 'DeletedFromWorkdir',
        },
      ],
    });
    const modifiedFilePathElement = screen.getByTitle(filePathMock);
    const modifiedDiffContentElement = screen.getByRole('group', {
      name: textMock('sync_header.show_changes_modal.file_diff_title', { fileName: fileNameMock }),
    });
    expect(modifiedDiffContentElement).not.toHaveAttribute('open');
    await user.click(modifiedFilePathElement);
    expect(modifiedDiffContentElement).toHaveAttribute('open');

    const addedFilePathElement = screen.getByTitle(addedFilePath);
    const addedDiffContentElement = screen.getByRole('group', {
      name: textMock('sync_header.show_changes_modal.file_diff_title', {
        fileName: 'addedFile.json',
      }),
    });
    expect(addedDiffContentElement).not.toHaveAttribute('open');
    await user.click(addedFilePathElement);
    expect(addedDiffContentElement).toHaveAttribute('open');

    const deletedFilePathElement = screen.getByTitle(deletedFilePath);
    await user.click(deletedFilePathElement);
    const deletedDiffContentElement = screen.queryByRole('group', {
      name: textMock('sync_header.show_changes_modal.file_diff_title', {
        fileName: 'removedFile.json',
      }),
    });
    expect(deletedDiffContentElement).not.toBeInTheDocument();

    expect(mockGetRepoDiff).toHaveBeenCalledTimes(1);
  });
});

const renderFileChangesInfoModal = (props: FileChangesInfoModalProps = defaultProps) => {
  const getRepoDiff = mockGetRepoDiff.mockImplementation(() => Promise.resolve(repoDiffMock));
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getRepoDiff,
  };
  return render(
    <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
      <FileChangesInfoModal {...props} />
    </ServicesContextProvider>,
  );
};

const renderFileChangesInfoModalAndWaitForData = async (
  props: FileChangesInfoModalProps = defaultProps,
) => {
  renderFileChangesInfoModal(props);
  await waitForElementToBeRemoved(() =>
    screen.queryByText(textMock('sync_header.show_changes_modal.repo_diff_pending_title')),
  );
};
