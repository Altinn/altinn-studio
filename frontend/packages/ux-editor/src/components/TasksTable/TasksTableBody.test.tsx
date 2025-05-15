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
import { layoutSetsExtendedMock } from '../../testing/layoutSetsMock';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';

const tasksMock: TaskNavigationGroup[] = [
  { taskType: 'data', name: 'Task 1' },
  { taskType: 'data', name: 'Task 2', taskId: 'Task_2' },
  { taskType: 'receipt', taskId: 'fake' },
];

describe('TasksTableBody', () => {
  it('should render the alert message when in navigation mode and no tasks are provided', () => {
    renderTasksTableBody({ tasks: [] });

    const alertTitle = screen.getByText(textMock('ux_editor.task_table_alert_title'));
    expect(alertTitle).toBeInTheDocument();
  });

  it('should render the tasks with their names, but not display buttons when in navigation mode', () => {
    renderTasksTableBody();

    const { task1, task2, layoutSet2Id, displayButtons } = getCommonElements();
    expect(task1).toBeInTheDocument();
    expect(task2).toBeInTheDocument();
    expect(layoutSet2Id).toBeInTheDocument();

    expect(displayButtons.length).toBe(0);
  });

  it('should not render the names when in hidden mode, but display buttons to each row', () => {
    renderTasksTableBody({ isNavigationMode: false });

    const { task1, task2, displayButtons } = getCommonElements();

    expect(task1).not.toBeInTheDocument();
    expect(task2).not.toBeInTheDocument();
    expect(displayButtons.length).toBe(3);
  });

  it('should call onSelectTask when a task is clicked', async () => {
    const user = userEvent.setup();
    const onSelectTask = jest.fn();
    renderTasksTableBody({ onSelectTask, isNavigationMode: false });

    const task1Button = screen.getAllByRole('button')[0];
    await user.click(task1Button);
    expect(onSelectTask).toHaveBeenCalledWith(0);
  });

  it('should render task name for receipt but not taskId', () => {
    renderTasksTableBody({ tasks: [tasksMock[2]] });

    const { receipt, receiptId } = getCommonElements();
    expect(receipt).toBeInTheDocument();
    expect(receiptId).not.toBeInTheDocument();
  });
});

const getCommonElements = () => ({
  task1: screen.queryByText(textMock('Task 1')),
  task2: screen.queryByText(textMock('Task 2')),
  receipt: screen.queryByText(textMock('ux_editor.task_table_type.receipt')),
  layoutSet2Id: screen.queryByText(/test-layout-set-2/),
  receiptId: screen.queryByText(/fake/),
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
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);
  const mergedProps = { ...defaultProps, ...props };

  return renderWithProviders(
    <StudioTable>
      <StudioTable.Body>
        <TasksTableBody {...mergedProps} />
      </StudioTable.Body>
    </StudioTable>,
    { queryClient },
  );
};
