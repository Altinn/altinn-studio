import React from 'react';
import { screen } from '@testing-library/react';
import { TasksTable, type TasksTableProps } from './TasksTable';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testing/mocks';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';

const tasksMock: TaskNavigationGroup[] = [
  { taskType: 'type1', name: 'Task 1', pageCount: 5 },
  { taskType: 'type2', name: 'Task 2', pageCount: 10 },
];

describe('TasksTable', () => {
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

    const hideAllButton = getButton(textMock('ux_editor.task_table_hide_all'));
    expect(hideAllButton).toBeInTheDocument();
  });

  it('should render show all button in footer when not in navigation mode', () => {
    renderTasksTable({ isNavigationMode: false });
    const showAllButton = getButton(textMock('ux_editor.task_table_show_all'));
    expect(showAllButton).toBeInTheDocument();
  });

  it('should call onSelectAllTasks when the button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectAllTasks = jest.fn();
    renderTasksTable({ onSelectAllTasks });

    const hideAllButton = getButton(textMock('ux_editor.task_table_hide_all'));
    await user.click(hideAllButton);
    expect(onSelectAllTasks).toHaveBeenCalledTimes(1);
  });
});

const getButton = (name: string) => {
  return screen.getByRole('button', { name });
};

const renderTasksTable = (props: Partial<TasksTableProps> = {}) => {
  const defaultProps: TasksTableProps = {
    tasks: tasksMock,
    onSelectTask: jest.fn(),
    onSelectAllTasks: jest.fn(),
  };

  const mergedProps = { ...defaultProps, ...props };
  return renderWithProviders(<TasksTable {...mergedProps} />);
};
