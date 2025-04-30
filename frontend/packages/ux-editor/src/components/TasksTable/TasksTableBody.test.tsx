import React from 'react';
import { render, screen } from '@testing-library/react';
import { TasksTableBody, type TasksTableBodyProps } from './TasksTableBody';
import { StudioTable } from '@studio/components';
import { textMock } from '@studio/testing/mocks/i18nMock';

const tasksMock = [
  { taskType: 'type1', taskName: 'Task 1', numberOfPages: 5 },
  { taskType: 'type2', taskName: 'Task 2', numberOfPages: 10 },
];

describe('TasksTableBody', () => {
  it('should render the alert message when in navigation mode and no tasks are provided', () => {
    renderTasksTableBody({ tasks: [] });
    const alertTitle = screen.getByText(textMock('ux_editor.task_table_alert_title'));
    expect(alertTitle).toBeInTheDocument();
  });

  it('should render the hidden tasks when not provided in navigation mode', () => {
    renderTasksTableBody({ isNavigationMode: false });

    const { task1, task2, displayButtons } = getCommonElements();
    expect(task1).toBeInTheDocument();
    expect(task2).toBeInTheDocument();
    expect(displayButtons.length).toBe(2);
  });

  it('should render the navigation tasks', () => {
    renderTasksTableBody();

    const { task1, task2, displayButtons } = getCommonElements();
    expect(task1).toBeInTheDocument();
    expect(task2).toBeInTheDocument();
    expect(displayButtons.length).toBe(0);
  });
});

const getCommonElements = () => ({
  task1: screen.getByText('Task 1'),
  task2: screen.getByText('Task 2'),
  displayButtons: screen.queryAllByRole('button', {
    name: textMock('ux_editor.task_table_display'),
  }),
});

const renderTasksTableBody = (props: Partial<TasksTableBodyProps> = {}) => {
  const defaultProps: TasksTableBodyProps = {
    tasks: tasksMock,
    isNavigationMode: true,
    onSelectTask: jest.fn(),
  };

  const mergedProps = { ...defaultProps, ...props };
  return render(
    <StudioTable>
      <StudioTable.Body>
        <TasksTableBody {...mergedProps} />
      </StudioTable.Body>
    </StudioTable>,
  );
};
