import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { FileChangesInfoModalProps } from './FileChangesInfoModal';
import { FileChangesInfoModal } from './FileChangesInfoModal';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from '../../../../../mocks/renderWithProviders';

const filePathMock = 'mock/file/path/to/fileName.json';
const defaultProps: FileChangesInfoModalProps = {
  fileChanges: [{ filePath: filePathMock, fileStatus: 'ModifiedInWorkdir' }],
};

describe('FileChangesInfoModal', () => {
  afterEach(jest.clearAllMocks);

  it('should render a trigger button and keep the modal closed initially', () => {
    renderFileChangesInfoModal();
    expect(getReviewChangesButton()).toBeInTheDocument();
    expect(queryModalHeading()).not.toBeInTheDocument();
  });

  it('should open the modal with its heading and the file changes table when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderFileChangesInfoModal();

    await user.click(getReviewChangesButton());

    expect(getModalHeading()).toBeInTheDocument();
    expect(getFileNameHeading()).toBeInTheDocument();
  });
});

const renderFileChangesInfoModal = (props: FileChangesInfoModalProps = defaultProps) =>
  renderWithProviders(queriesMock)(<FileChangesInfoModal {...props} />);

const getReviewChangesButton = () =>
  screen.getByRole('button', { name: textMock('sync_header.review_file_changes') });

const getModalHeading = () => screen.getByRole('heading', { name: modalHeading });
const queryModalHeading = () => screen.queryByRole('heading', { name: modalHeading });

const getFileNameHeading = () =>
  screen.getByRole('columnheader', {
    name: textMock('sync_header.show_changes_modal.column_header_file_name'),
  });

const modalHeading = textMock('sync_header.show_changes_modal.title');
