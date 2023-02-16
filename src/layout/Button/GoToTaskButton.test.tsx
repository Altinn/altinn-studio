import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { GoToTaskButton } from 'src/layout/Button/GoToTaskButton';
import { setupStore } from 'src/store';
import { mockComponentProps, renderWithProviders } from 'src/testUtils';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

interface RenderProps {
  props: Partial<IButtonProvidedProps>;
  dispatch: (...args: any[]) => any;
}

const render = ({ props, dispatch }: RenderProps) => {
  const stateMock = getInitialStateMock();
  stateMock.process.availableNextTasks = ['a', 'b'];
  const store = setupStore(stateMock);

  store.dispatch = dispatch;

  renderWithProviders(
    <GoToTaskButton
      {...mockComponentProps}
      {...props}
    >
      Go to task
    </GoToTaskButton>,
    {
      store,
    },
  );
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
