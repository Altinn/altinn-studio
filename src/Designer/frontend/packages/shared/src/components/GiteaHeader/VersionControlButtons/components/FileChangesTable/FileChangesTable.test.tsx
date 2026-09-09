import type { RenderResult } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { FileChangesTableProps } from './FileChangesTable';
import { FileChangesTable } from './FileChangesTable';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from '../../../mocks/renderWithProviders';

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
const defaultProps: FileChangesTableProps = {
  fileChanges: [
    {
      filePath: filePathMock,
      fileStatus: fileStatusMock,
    },
  ],
};

describe('FileChangesTable', () => {
  afterEach(jest.clearAllMocks);

  it('should render a table with filePath and fileStatus column headers', () => {
    renderFileChangesTable();
    expect(getFileNameHeading()).toBeInTheDocument();
    expect(getFileStatusHeading()).toBeInTheDocument();
  });

  it('should render the filePath and fileStatus correctly', () => {
    renderFileChangesTable();

    screen.getByTitle(filePathMock);
    screen.getByText(filePathWithoutNameMock);
    screen.getByText(fileNameMock, { selector: 'strong' });

    const fileStatusText = textMock(`sync_header.show_changes_modal.file_status_${fileStatusMock}`);
    screen.getByRole('cell', { name: fileStatusText });
  });

  it('should call getRepoDiff', () => {
    renderFileChangesTable();
    expect(mockGetRepoDiff).toHaveBeenCalledTimes(1);
  });

  it.each(['ModifiedInWorkdir', 'NewInWorkdir', 'DeletedFromWorkdir'])(
    'should render filePath as clickable when fileStatus is %s',
    async (fileStatus) => {
      const user = userEvent.setup();
      renderFileChangesTable({ fileChanges: [{ filePath: filePathMock, fileStatus }] });

      const diffContentElement = await screen.findByRole('group', {
        name: fileDiffHeading(fileNameMock),
      });
      expect(diffContentElement).not.toHaveAttribute('open');

      await user.click(screen.getByTitle(filePathMock));
      expect(diffContentElement).toHaveAttribute('open');
    },
  );
});

const renderFileChangesTable = (props: FileChangesTableProps = defaultProps): RenderResult => {
  const getRepoDiff = mockGetRepoDiff.mockImplementation(() => Promise.resolve(repoDiffMock));

  return renderWithProviders({ ...queriesMock, getRepoDiff })(<FileChangesTable {...props} />);
};

const getFileNameHeading = () => getColumnheader(fileNameHeading);
const getFileStatusHeading = () => getColumnheader(fileStatusHeading);
const getColumnheader = (name: string) => screen.getByRole('columnheader', { name });

const fileDiffHeading = (fileName: string) =>
  textMock('sync_header.show_changes_modal.file_diff_title', { fileName });
const fileNameHeading = textMock('sync_header.show_changes_modal.column_header_file_name');
const fileStatusHeading = textMock('sync_header.show_changes_modal.column_header_file_status');
