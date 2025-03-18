import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import type { FileChangesInfoModalProps } from './FileChangesInfoModal';
import { FileChangesInfoModal } from './FileChangesInfoModal';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from '../../../../../mocks/renderWithProviders';

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
const defaultProps: FileChangesInfoModalProps = {
  fileChanges: [
    {
      filePath: filePathMock,
      fileStatus: fileStatusMock,
    },
  ],
};

describe('FileChangesInfoModal', () => {
  afterEach(jest.clearAllMocks);

  it('should render the modal with a table of filePath and fileStatus columns', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);
    expect(getModalHeading()).toBeInTheDocument();
    expect(getFileNameHeading()).toBeInTheDocument();
    expect(getFileStatusHeading()).toBeInTheDocument();
  });

  it('should render the filePath and fileStatus correctly', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    screen.getByTitle(filePathMock);
    screen.getByText(filePathWithoutNameMock);
    screen.getByText(fileNameMock, { selector: 'strong' });

    const fileStatusText = textMock(`sync_header.show_changes_modal.file_status_${fileStatusMock}`);
    screen.getByRole('cell', { name: fileStatusText });
  });

  it('should call getRepoDiff', () => {
    renderFileChangesInfoModal();
    expect(mockGetRepoDiff).toHaveBeenCalledTimes(1);
  });

  it.each(['ModifiedInWorkdir', 'NewInWorkdir', 'DeletedFromWorkdir'])(
    'should render filePath as clickable when fileStatus is %s',
    async (fileStatus) => {
      const user = userEvent.setup();
      const props: FileChangesInfoModalProps = {
        ...defaultProps,
        fileChanges: [
          {
            filePath: filePathMock,
            fileStatus: fileStatus,
          },
        ],
      };
      const modifiedDiffContentElement = () =>
        screen.getByRole('group', { name: fileDiffHeading(fileNameMock) });
      const modifiedFilePathElement = () => screen.getByTitle(filePathMock);

      await renderAndOpenModal(user, props);
      expect(modifiedDiffContentElement()).not.toHaveAttribute('open');
      await user.click(modifiedFilePathElement());
      expect(modifiedDiffContentElement()).toHaveAttribute('open');
    },
  );
});

const renderFileChangesInfoModal = (
  props: FileChangesInfoModalProps = defaultProps,
): RenderResult => {
  const getRepoDiff = mockGetRepoDiff.mockImplementation(() => Promise.resolve(repoDiffMock));

  return renderWithProviders({ ...queriesMock, getRepoDiff })(<FileChangesInfoModal {...props} />);
};

const renderAndOpenModal = async (
  user: UserEvent,
  props: FileChangesInfoModalProps = defaultProps,
): Promise<RenderResult> => {
  const result = renderFileChangesInfoModal(props); // eslint-disable-line testing-library/render-result-naming-convention
  await user.click(getReviewChangesButton());
  return result;
};

const getModalHeading = () => getHeading(modalHeading);
const getHeading = (name: string) => screen.getByRole('heading', { name });

const getReviewChangesButton = () => getButton(reviewChangesButtonName);
const getButton = (name: string) => screen.getByRole('button', { name });

const getFileNameHeading = () => getColumnheader(fileNameHeading);
const getFileStatusHeading = () => getColumnheader(fileStatusHeading);
const getColumnheader = (name: string) => screen.getByRole('columnheader', { name });

const modalHeading = textMock('sync_header.show_changes_modal.title');
const fileDiffHeading = (fileName: string) =>
  textMock('sync_header.show_changes_modal.file_diff_title', { fileName });
const fileNameHeading = textMock('sync_header.show_changes_modal.column_header_file_name');
const fileStatusHeading = textMock('sync_header.show_changes_modal.column_header_file_status');
const reviewChangesButtonName = textMock('sync_header.review_file_changes');
