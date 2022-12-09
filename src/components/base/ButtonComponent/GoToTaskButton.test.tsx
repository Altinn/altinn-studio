import * as React from 'react';

import { getInitialStateMock } from '__mocks__/mocks';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'testUtils';

import { GoToTaskButton } from 'src/components/base/ButtonComponent/GoToTaskButton';
import { setupStore } from 'src/store';
import type { Props as GoToTaskButtonProps } from 'src/components/base/ButtonComponent/GoToTaskButton';

const render = ({ props = {}, dispatch = jest.fn() } = {}) => {
  const allProps = {
    id: 'go-to-task-button',
    ...props,
  } as GoToTaskButtonProps;
  const stateMock = getInitialStateMock();
  stateMock.process.availableNextTasks = ['a', 'b'];
  const store = setupStore(stateMock);

  store.dispatch = dispatch;

  renderWithProviders(<GoToTaskButton {...allProps}>Go to task</GoToTaskButton>, {
    store,
  });
};

describe('GoToTaskButton', () => {
  it('should show button and it should be possible to click', async () => {
    const dispatch = jest.fn();
    render({
      props: {
        taskId: 'a',
      },
      dispatch,
    });
    expect(screen.getByText('Go to task')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(dispatch).toHaveBeenCalled();
  });
  it('should show button and it should not be possible to click', async () => {
    const dispatch = jest.fn();
    render({
      props: {
        taskId: 'c',
      },
      dispatch,
    });
    expect(screen.getByText('Go to task')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    await userEvent.click(screen.getByRole('button'));
    expect(dispatch).not.toHaveBeenCalled();
  });
});
