import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FilePathProps } from './FilePath';
import { FilePath } from './FilePath';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from '../../../../../../mocks/renderWithProviders';

const fileNameMock = 'fileName.json';
const filePathWithoutNameMock = 'mock/file/path/to';
const filePathMock = `${filePathWithoutNameMock}/${fileNameMock}`;
const repoDiffMock = `diff --git a/fileName.json b/fileName.json
index 0909a03..527e226 100644
--- a/fileName.json
+++ b/fileName.json
@@ -2,6 +2,30 @@
- old line
+ new line
\ No newline at end of file`;
const mockGetRepoDiff = jest.fn();

describe('FilePath', () => {
  afterEach(jest.clearAllMocks);

  it('should render the file path and name correctly', async () => {
    renderFilePath();

    const filePathElement = screen.getByText(filePathWithoutNameMock);
    const fileNameElement = screen.getByText(fileNameMock, { selector: 'strong' });

    expect(filePathElement).toBeInTheDocument();
    expect(fileNameElement).toBeInTheDocument();
  });

  it('should toggle diff view on file path click', async () => {
    const user = userEvent.setup();
    renderFilePath();

    const filePathElement = screen.getByTitle(filePathMock);
    await user.click(filePathElement);

    const diffLineElement = screen.getByText('+ new line');
    expect(diffLineElement).toBeVisible();

    await user.click(filePathElement);
    expect(diffLineElement).not.toBeVisible();
  });

  it('should remove "No newline at end of file" from diff lines', async () => {
    const user = userEvent.setup();
    renderFilePath();

    const filePathElement = screen.getByTitle(filePathMock);
    await user.click(filePathElement);

    const diffLineElement = screen.getByText('+ new line');
    expect(diffLineElement).toBeInTheDocument();
    const noNewlineElement = screen.queryByText('No newline at end of file');
    expect(noNewlineElement).not.toBeInTheDocument();
  });

  it('should not render filePath as button when repoDiffStatus is error', async () => {
    const user = userEvent.setup();
    renderFilePath({ repoDiffStatus: 'error' });

    const filePathElement = screen.getByTitle(filePathMock);
    await user.click(filePathElement);

    const diffLineElement = screen.queryByText('+ new line');
    expect(diffLineElement).not.toBeInTheDocument();
  });

  it('should not render filePath as button when repoDiffStatus is pending', async () => {
    const user = userEvent.setup();
    renderFilePath({ repoDiffStatus: 'pending' });

    const filePathElement = screen.getByTitle(filePathMock);
    await user.click(filePathElement);

    const diffLineElement = screen.queryByText('+ new line');
    expect(diffLineElement).not.toBeInTheDocument();
  });

  it('should not render first part of git diff that is metadata', async () => {
    const user = userEvent.setup();
    renderFilePath();

    const filePathElement = screen.getByTitle(filePathMock);
    await user.click(filePathElement);

    const diffLineMetadata1 = screen.queryByText('diff --git a/fileName.json b/fileName.json');
    const diffLineMetadata2 = screen.queryByText('index 0909a03..527e226 100644');
    const diffLineMetadata3 = screen.queryByText('--- a/fileName.json');
    const diffLineMetadata4 = screen.queryByText('+++ b/fileName.json');
    const diffLineMetadata5 = screen.queryByText('@@ -2,6 +2,30 @@');
    expect(diffLineMetadata1).not.toBeInTheDocument();
    expect(diffLineMetadata2).not.toBeInTheDocument();
    expect(diffLineMetadata3).not.toBeInTheDocument();
    expect(diffLineMetadata4).not.toBeInTheDocument();
    expect(diffLineMetadata5).not.toBeInTheDocument();
    const diffLineElement = screen.getByText('+ new line');
    expect(diffLineElement).toBeInTheDocument();
  });
});

const renderFilePath = (props: Partial<FilePathProps> = {}) => {
  const defaultProps: FilePathProps = {
    filePath: filePathMock,
    diff: repoDiffMock,
    repoDiffStatus: 'success',
    ...props,
  };
  const getRepoDiff = mockGetRepoDiff.mockImplementation(() => Promise.resolve(repoDiffMock));
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getRepoDiff,
  };
  return renderWithProviders(allQueries)(<FilePath {...defaultProps} />);
};
