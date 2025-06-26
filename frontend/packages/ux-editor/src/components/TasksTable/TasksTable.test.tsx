import React from 'react';
import { screen } from '@testing-library/react';
import { TasksTable, type TasksTableProps } from './TasksTable';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testing/mocks';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';

const tasksMock: TaskNavigationGroup[] = [
  { taskType: 'type1', name: 'Task 1' },
  { taskType: 'type2', name: 'Task 2' },
];

const allTasksMock: TaskNavigationGroup[] = [...tasksMock, { taskType: 'type3', name: 'Task 3' }];

describe('TasksTable', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should render the table with tasks', () => {
    renderTasksTable();

    const task1 = screen.getByText(textMock('Task 1'));
    const task2 = screen.getByText(textMock('Task 2'));
    expect(task1).toBeInTheDocument();
    expect(task2).toBeInTheDocument();
  });

  it('should render the table when tasks is undefined', () => {
    renderTasksTable({ tasks: undefined });

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('should render hide all button in footer when in navigation mode', () => {
    renderTasksTable();
    expect(getHideAllButton()).toBeInTheDocument();
  });

  it('should render show all button in footer when not in navigation mode', () => {
    renderTasksTable({ isNavigationMode: false });
    expect(getShowAllButton()).toBeInTheDocument();
  });

  it('should remove all tasks from navigation table when hide all button is clicked and confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));
    const user = userEvent.setup();
    renderTasksTable();

    await user.click(getHideAllButton());
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledWith(org, app, []);
  });

  it('should add all tasks to navigation table when show all button is clicked', async () => {
    const user = userEvent.setup();
    renderTasksTable({ isNavigationMode: false });

    await user.click(getShowAllButton());
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledWith(org, app, allTasksMock);
  });

  it('should disable hide all button when there are no tasks to hide', () => {
    renderTasksTable({ tasks: [] });
    expect(getHideAllButton()).toBeDisabled();
  });

  it('should disable show all button when there are no tasks to show', () => {
    renderTasksTable({ tasks: [], allTasks: [], isNavigationMode: false });
    expect(getShowAllButton()).toBeDisabled();
  });

  it('should render preview link when in navigation mode', () => {
    renderTasksTable();

    const previewLink = getPreviewLink();
    expect(previewLink).toBeInTheDocument();
    expect(previewLink).toHaveAttribute('href', `/preview/${org}/${app}`);
  });

  it('should not render preview link when not in navigation mode', () => {
    renderTasksTable({ isNavigationMode: false });

    const previewLink = getPreviewLink();
    expect(previewLink).not.toBeInTheDocument();
  });
});

const getHideAllButton = () => {
  return screen.getByRole('button', {
    name: textMock('ux_editor.task_table_hide_all'),
  });
};
const getShowAllButton = () => {
  return screen.getByRole('button', {
    name: textMock('ux_editor.task_table_show_all'),
  });
};

const getPreviewLink = () => {
  return screen.queryByRole('link', {
    name: textMock('ux_editor.task_table_preview'),
  });
};

const renderTasksTable = (props: Partial<TasksTableProps> = {}) => {
  const defaultProps: TasksTableProps = {
    tasks: tasksMock,
    allTasks: allTasksMock,
  };

  const mergedProps = { ...defaultProps, ...props };
  return renderWithProviders(<TasksTable {...mergedProps} />);
};
