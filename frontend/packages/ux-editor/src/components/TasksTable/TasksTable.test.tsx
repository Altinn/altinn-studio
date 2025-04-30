import React from 'react';
import { render, screen } from '@testing-library/react';
import { TasksTable, type TasksTableProps } from './TasksTable';
import { textMock } from '@studio/testing/mocks/i18nMock';

const tasksMock = [
  { taskType: 'type1', taskName: 'Task 1', numberOfPages: 5 },
  { taskType: 'type2', taskName: 'Task 2', numberOfPages: 10 },
];

describe('TasksTable', () => {
  it('should render the table with tasks', () => {
    renderTasksTable();
    const task1 = screen.getByText('Task 1');
    const task2 = screen.getByText('Task 2');
    expect(task1).toBeInTheDocument();
    expect(task2).toBeInTheDocument();
  });

  it('should render hide all button in footer when in navigation mode', () => {
    renderTasksTable();
    const hideAllButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table_hide_all'),
    });
    expect(hideAllButton).toBeInTheDocument();
  });

  it('should render show all button in footer when not in navigation mode', () => {
    renderTasksTable({ isNavigationMode: false });
    const showAllButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table_show_all'),
    });
    expect(showAllButton).toBeInTheDocument();
  });
});

const renderTasksTable = (props: Partial<TasksTableProps> = {}) => {
  const defaultProps: TasksTableProps = {
    tasks: tasksMock,
    onSelectTask: jest.fn(),
    onSelectAllTasks: jest.fn(),
  };

  const mergedProps = { ...defaultProps, ...props };
  return render(<TasksTable {...mergedProps} />);
};
