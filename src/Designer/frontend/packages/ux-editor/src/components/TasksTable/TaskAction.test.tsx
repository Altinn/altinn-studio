import React from 'react';
import { renderWithProviders } from '../../testing/mocks';
import { TaskAction, type TaskActionProps } from './TaskAction';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layoutSetsExtendedMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { TaskType } from '../Settings/SettingsUtils';
import type { AppContextProps } from '@altinn/ux-editor/AppContext';

const mockTask = [
  {
    taskId: 'Task_1',
    taskType: 'data',
    pageCount: 2,
  },
  {
    taskId: 'Task_2',
    taskType: 'data',
    pageCount: 3,
  },
];

describe('TaskAction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should render display button when not in navigation mode', () => {
    renderTaskAction({ props: { isNavigationMode: false } });

    const displayButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table_display'),
    });
    expect(displayButton).toBeInTheDocument();
  });

  it('should call removeNavigationTask when hide button is clicked', async () => {
    const user = userEvent.setup();

    renderTaskAction();

    await openTaskActionsMenu();
    const hideButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table.menu_task_hide'),
    });
    await user.click(hideButton);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledWith(org, app, [mockTask[1]]);
  });

  it('should call addTaskToNavigationGroup when display button is clicked', async () => {
    const user = userEvent.setup();
    const hiddenTask = {
      taskId: 'Task_3',
      taskType: 'data',
      pageCount: 3,
    };

    renderTaskAction({
      props: {
        isNavigationMode: false,
        task: hiddenTask,
      },
    });
    const displayButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table_display'),
    });
    await user.click(displayButton);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledWith(org, app, [
      ...mockTask,
      hiddenTask,
    ]);
  });

  it('should call moveNavigationTask when down button is clicked', async () => {
    const user = userEvent.setup();
    renderTaskAction();

    await openTaskActionsMenu();
    const downButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table.menu_task_down'),
    });
    await user.click(downButton);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledWith(org, app, [
      mockTask[1],
      mockTask[0],
    ]);
  });

  it('should call moveNavigationTask when up button is clicked', async () => {
    const user = userEvent.setup();
    renderTaskAction({ props: { task: mockTask[1], index: 1 } });

    await openTaskActionsMenu();
    const upButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table.menu_task_up'),
    });
    await user.click(upButton);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledWith(org, app, [
      mockTask[1],
      mockTask[0],
    ]);
  });

  it('should disable move up button when task is first in the list', async () => {
    renderTaskAction();

    await openTaskActionsMenu();
    const upButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table.menu_task_up'),
    });
    expect(upButton).toBeDisabled();
  });

  it('should disable move down button when task is last in the list', async () => {
    renderTaskAction({ props: { task: mockTask[1], index: 1 } });

    await openTaskActionsMenu();
    const downButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table.menu_task_down'),
    });
    expect(downButton).toBeDisabled();
  });

  it('should disable form editor button when task is a default receipt', async () => {
    renderTaskAction({ props: { task: { taskType: TaskType.Receipt } } });
    await openTaskActionsMenu();
    const formEditorButton = await getFormEditorButton();
    expect(formEditorButton).toBeDisabled();
  });
});

const openTaskActionsMenu = async () => {
  const user = userEvent.setup();
  const menuButton = screen.getByTestId('task-actions-menu');
  await user.click(menuButton);
};

const getFormEditorButton = async () =>
  await screen.findByRole('button', {
    name: textMock('ux_editor.task_table.menu_task_redirect'),
  });

type RenderTaskActionProps = {
  props?: Partial<TaskActionProps>;
  appContextProps?: Partial<AppContextProps>;
};

const renderTaskAction = ({ props, appContextProps }: RenderTaskActionProps = {}) => {
  const mockProps: TaskActionProps = {
    task: mockTask[0],
    tasks: mockTask,
    index: 0,
    isNavigationMode: true,
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.TaskNavigationGroup, org, app], mockTask);
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);
  const mergedProps = { ...mockProps, ...props };
  renderWithProviders(<TaskAction {...mergedProps} />, { queryClient, appContextProps });
};
