import React from 'react';
import { renderWithProviders } from '../../testing/mocks';
import { TaskAction, type TaskActionProps } from './TaskAction';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { app, org } from '@studio/testing/testids';

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
  it('should render display button when not in navigation mode', () => {
    renderTaskAction({ isNavigationMode: false });

    const displayButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table_display'),
    });
    expect(displayButton).toBeInTheDocument();
  });

  it('should call removeNavigationTask when hide button is clicked', async () => {
    const user = userEvent.setup();

    renderTaskAction({
      isNavigationMode: true,
    });

    const hideButton = screen.getByRole('button', {
      name: textMock('ux_editor.task_table.menu_task_hide'),
    });
    await user.click(hideButton);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTaskNavigationGroup).toHaveBeenCalledWith(org, app, [mockTask[1]]);
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
