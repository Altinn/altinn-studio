import * as React from 'react';

import { getInitialStateMock } from '__mocks__/mocks';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'testUtils';

import { InstantiationButton } from 'src/components/base/ButtonComponent/InstantiationButton';
import { setupStore } from 'src/store';
import type { InstantiationButtonProps as InstantiationButtonProps } from 'src/components/base/ButtonComponent/InstantiationButton';

const render = ({ props = {} }) => {
  const allProps = {
    id: 'instantiate-button',
    ...props,
  } as InstantiationButtonProps;
  const stateMock = getInitialStateMock();
  const store = setupStore(stateMock);

  const spy = jest.spyOn(store, 'dispatch');

  renderWithProviders(
    <InstantiationButton {...allProps}>Instantiate</InstantiationButton>,
    {
      store,
    },
  );
  return spy;
};

describe('InstantiationButton', () => {
  it('should show button and it should be possible to click and start loading', async () => {
    const dispatch = render({});
    expect(screen.getByText('Instantiate')).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledTimes(0);
    expect(screen.queryByText('general.loading')).toBeNull();
    await userEvent.click(screen.getByRole('button'));
    expect(dispatch).toHaveBeenCalled();
    expect(screen.getByText('general.loading')).toBeInTheDocument();
  });
});
