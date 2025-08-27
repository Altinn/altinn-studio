import React from 'react';
import { screen } from '@testing-library/react';
import { TasksTableBody, type TasksTableBodyProps } from './TasksTableBody';
import { StudioTable } from 'libs/studio-components/src';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSetsExtendedMock } from '../../testing/layoutSetsMock';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';

const tasksMock: TaskNavigationGroup[] = [
  { taskType: 'data', name: 'Task 1', taskId: 'Task_1' },
  { taskType: 'data', name: 'Task 2', taskId: 'Task_2' },
  { taskType: 'receipt', taskId: 'fake' },
];

describe('TasksTableBody', () => {
  it('should render the alert message when in navigation mode and no tasks are provided', () => {
    renderTasksTableBody({ props: { tasks: [] } });

    const alertTitle = screen.getByText(textMock('ux_editor.task_table_alert_title'));
    expect(alertTitle).toBeInTheDocument();
  });

  it('should render task name and page count', () => {
    renderTasksTableBody();

    const taskMock1 = tasksMock[0];
    const layoutSetMock1 = layoutSetsExtendedMock[0];

    expect(
      screen.getByText(
        `${textMock('ux_editor.task_table_type.' + taskMock1.taskType)}: ${layoutSetMock1.id}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(layoutSetMock1.pageCount)).toBeInTheDocument();

    const taskMock2 = tasksMock[1];
    const layoutSetMock2 = layoutSetsExtendedMock[1];

    expect(
      screen.getByText(
        `${textMock('ux_editor.task_table_type.' + taskMock2.taskType)}: ${layoutSetMock2.id}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(layoutSetMock2.pageCount)).toBeInTheDocument();
  });

  it('should show 1 as page count when the task is a receipt', () => {
    renderTasksTableBody();

    const taskMockReceipt = tasksMock[2];

    expect(
      screen.getAllByText(
        `${textMock('ux_editor.task_table_type.' + taskMockReceipt.taskType)}`,
      )[0],
    ).toBeInTheDocument();
    expect(screen.getByText(1)).toBeInTheDocument();
  });

  it('should show correct page count when the task is a custom receipt', () => {
    const layoutSetsExtended = [
      {
        id: 'layoutSet3SubformNameMock',
        dataType: 'data-model-3',
        type: 'data',
        task: { id: PROTECTED_TASK_NAME_CUSTOM_RECEIPT, type: 'data' },
        pageCount: 4,
      },
    ];

    renderTasksTableBody({
      layoutSetsExtended,
    });

    const taskMockReceipt = tasksMock[2];

    expect(
      screen.getAllByText(
        `${textMock('ux_editor.task_table_type.' + taskMockReceipt.taskType)}`,
      )[0],
    ).toBeInTheDocument();
    expect(screen.getByText(layoutSetsExtended[0].pageCount)).toBeInTheDocument();
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
    renderTasksTableBody({ props: { isNavigationMode: false } });

    const { task1, task2, displayButtons } = getCommonElements();

    expect(task1).not.toBeInTheDocument();
    expect(task2).not.toBeInTheDocument();
    expect(displayButtons.length).toBe(3);
  });

  it('should render task name for receipt but not taskId', () => {
    renderTasksTableBody({ props: { tasks: [tasksMock[2]] } });

    const { receipt, receiptId } = getCommonElements();
    expect(receipt).toBeInTheDocument();
    expect(receiptId).not.toBeInTheDocument();
  });
});

const getCommonElements = () => ({
  task1: screen.queryByText(textMock('Task 1')),
  task2: screen.queryByText(textMock('Task 2')),
  receipt: screen.queryAllByText(textMock('ux_editor.task_table_type.receipt'))[0],
  layoutSet2Id: screen.queryByText(/test-layout-set-2/),
  receiptId: screen.queryByText(/fake/),
  displayButtons: screen.queryAllByRole('button', {
    name: textMock('ux_editor.task_table_display'),
  }),
});

const renderTasksTableBody = ({
  props = {},
  layoutSetsExtended = layoutSetsExtendedMock,
}: {
  props?: Partial<TasksTableBodyProps>;
  layoutSetsExtended?: LayoutSetModel[];
} = {}) => {
  const defaultProps: TasksTableBodyProps = {
    tasks: tasksMock,
    isNavigationMode: true,
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtended);
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
