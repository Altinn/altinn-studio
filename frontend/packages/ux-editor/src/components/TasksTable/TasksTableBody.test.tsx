import React from 'react';
import { screen } from '@testing-library/react';
import { TasksTableBody, type TasksTableBodyProps } from './TasksTableBody';
import { StudioTable } from '@studio/components';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';

const tasksMock: TaskNavigationGroup[] = [
  { taskType: 'type1', name: 'Task 1', pageCount: 5, taskId: '1' },
  { taskType: 'type2', name: 'Task 2', pageCount: 10 },
];

const mockLayoutSetsModel = {
  sets: [
    { id: '1', name: 'Task 1', dataType: 'default', type: 'default' },
    { id: '2', name: 'Task 2', dataType: 'default', type: 'default' },
  ],
};

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

  it('should call onSelectTask when a task is clicked', async () => {
    const user = userEvent.setup();
    const onSelectTask = jest.fn();
    renderTasksTableBody({ onSelectTask, isNavigationMode: false });

    const task1Button = screen.getAllByRole('button')[0];
    await user.click(task1Button);
    expect(onSelectTask).toHaveBeenCalledWith(0);
  });
});

const getCommonElements = () => ({
  task1: screen.getByText(textMock('Task 1')),
  task2: screen.getByText(textMock('Task 2')),
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
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], mockLayoutSetsModel);
  const mergedProps = { ...defaultProps, ...props };

  return renderWithProviders(
    <StudioTable>
      <StudioTable.Body>
        <TasksTableBody {...mergedProps} />
      </StudioTable.Body>
    </StudioTable>,
  );
};
