import React from 'react';
import { HandleMergeConflictFileList } from './HandleMergeConflictFileList';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const renderHandleMergeConflictFileList = (mockRepostatus?: any) => {
  const user = userEvent.setup();
  const mockClasses: any = {};
  const mockLanguage: any = {};
  const repoStatus = mockRepostatus ?? {
    behindBy: 1,
    aheadBy: 3,
    contentStatus: [
      {
        filePath: 'Model/ServiceModel.cs',
        fileStatus: 'ModifiedInWorkdir',
      },
      {
        filePath: 'Resources/FormLayout.json',
        fileStatus: 'Conflicted',
      },
      {
        filePath: 'Resources/react-app.css',
        fileStatus: 'ModifiedInWorkdir',
      },
    ],
    repositoryStatus: 'MergeConflict',
    hasMergeConflict: true,
  };
  const changeSelectedFile: (file: string) => void = jest.fn();
  const container = render(
    <HandleMergeConflictFileList
      changeSelectedFile={changeSelectedFile}
      classes={mockClasses}
      language={mockLanguage}
      repoStatus={repoStatus}
    />,
  );
  return { changeSelectedFile, user, repoStatus, container };
};

test('should render 3 files', () => {
  const { repoStatus } = renderHandleMergeConflictFileList();
  const handleMergeConflictFileList = screen.getByRole('list');
  expect(handleMergeConflictFileList.id).toBe('handleMergeConflictFileList');
  expect(screen.getAllByRole('listitem')).toHaveLength(
    repoStatus.contentStatus.length,
  );
});

test('should render correct text in fileListItem', () => {
  const { repoStatus } = renderHandleMergeConflictFileList();

  const expectedFilenames = repoStatus.contentStatus
    .map((item: any) => item.filePath)
    .sort();
  const renderedFilenames = screen
    .getAllByRole('listitem')
    .map((listitem) => listitem.textContent)
    .sort();
  expect(expectedFilenames).toEqual(renderedFilenames);
});

test('should show correct icons', () => {
  const { container } = renderHandleMergeConflictFileList();
  // Expect correct icons to show
  expect(container.baseElement.getElementsByClassName('fa-check')).toHaveLength(
    2,
  );
  expect(
    container.baseElement.getElementsByClassName('fa-circlecancel'),
  ).toHaveLength(1);
});

test('should trigger handleListItemClick() when listItem is clicked', async () => {
  const { user, changeSelectedFile } = renderHandleMergeConflictFileList();
  const listitems = screen.getAllByRole('listitem');
  await user.click(listitems[0]);
  expect(changeSelectedFile).toHaveBeenCalled();
});

test('should render nothing when repoStatus.contentStatus is null', async () => {
  renderHandleMergeConflictFileList({
    contentStatus: null,
  });
  // Expect file list to not exist
  expect(screen.queryAllByRole('list')).toHaveLength(0);
});

test('should render list, no items, when repoStatus.contentStatus.length is 0', async () => {
  renderHandleMergeConflictFileList({
    contentStatus: [],
  });
  expect(screen.queryAllByRole('list')).toHaveLength(1);
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
});
