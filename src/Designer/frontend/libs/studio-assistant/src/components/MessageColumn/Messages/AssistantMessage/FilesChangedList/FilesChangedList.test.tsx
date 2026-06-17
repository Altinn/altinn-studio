import { FilesChangedList, type FilesChangedListProps } from './FilesChangedList';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

const fileName = 'layout.json';
const directory = 'App/ui';
const filePath = `${directory}/${fileName}`;

describe('FilesChangedList', () => {
  it('renders a button with the file name and directory', () => {
    renderFilesChangedList();

    const fileButton = screen.getByRole('button', { name: `${fileName} ${directory}` });
    expect(fileButton).toBeInTheDocument();
  });

  it('does not render a directory for a file path without one', () => {
    renderFilesChangedList({ filePaths: [fileName] });

    expect(screen.getByRole('button', { name: fileName })).toBeInTheDocument();
  });
});

const defaultProps: FilesChangedListProps = {
  filePaths: [filePath],
};

const renderFilesChangedList = (props: Partial<FilesChangedListProps> = {}): RenderResult =>
  render(<FilesChangedList {...defaultProps} {...props} />);
