import React from 'react';
import { renderWithProviders } from '../../testing/mocks';
import { TaskAction, type TaskActionProps } from './TaskAction';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { app, org } from '@studio/testing/testids';
import { iterate } from 'glob';

const mockTask = [
  {
    taskId: 'task1',
    taskType: 'TaskType1',
    pageCount: 2,
  },
  {
    taskId: 'task2',
    taskType: 'TaskType2',
    pageCount: 3,
  },
];

describe('TaskAction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should render display button when not in navigation mode', () => {
    renderTaskAction({ isNavigationMode: false });

    const displayButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table_display'),
    });
    expect(displayButton).toBeInTheDocument();
  });

  it('should call removeNavigationTask when hide button is clicked', async () => {
    const user = userEvent.setup();

    renderTaskAction();

    const hideButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table.menu_task_hide'),
    });
    await user.click(hideButton);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledWith(org, app, [mockTask[1]]);
  });

  it('should call moveNavigationTask when down button is clicked', async () => {
    const user = userEvent.setup();
    renderTaskAction();

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
    renderTaskAction({ task: mockTask[1], index: 1 });

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

  it('should disable move up button when task is first in the list', () => {
    renderTaskAction();

    const upButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table.menu_task_up'),
    });
    expect(upButton).toBeDisabled();
  });
  it('should disable move down button when task is last in the list', () => {
    renderTaskAction({ task: mockTask[1], index: 1 });

    const downButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table.menu_task_down'),
    });
    expect(downButton).toBeDisabled();
  });
});

const renderTaskAction = (props: Partial<TaskActionProps> = {}) => {
  const mockProps: TaskActionProps = {
    task: mockTask[0],
    tasks: mockTask,
    index: 0,
    isNavigationMode: true,
  };

  const mergedProps = { ...mockProps, ...props };
  renderWithProviders(<TaskAction {...mergedProps} />);
};
