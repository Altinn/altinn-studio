import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { FileChangesInfoModalProps } from './FileChangesInfoModal';
import { FileChangesInfoModal } from './FileChangesInfoModal';

const fileNameMock = 'fileName.json';
const filePathWithoutNameMock = 'mock/file/path/to';
const filePathMock = `${filePathWithoutNameMock}/${fileNameMock}`;
const fileStatusMock = 'ModifiedInWorkdir';

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
});

const renderFileChangesInfoModal = () => {
  return render(<FileChangesInfoModal {...defaultProps} />);
};
