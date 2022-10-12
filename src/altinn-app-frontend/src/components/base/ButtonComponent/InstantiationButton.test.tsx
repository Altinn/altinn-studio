import * as React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getInitialStateMock } from '__mocks__/mocks';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import mockAxios from 'jest-mock-axios';
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
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path={'/'}
          element={
            <InstantiationButton {...allProps}>Instantiate</InstantiationButton>
          }
        />
        <Route
          path='/instance/abc123'
          element={<span>You are now looking at the instance</span>}
        />
      </Routes>
    </MemoryRouter>,
    {
      store,
    },
  );

  return spy;
};

describe('InstantiationButton', () => {
  it('should show button and it should be possible to click and start loading', async () => {
    mockAxios.reset();
    const dispatch = render({});
    expect(screen.getByText('Instantiate')).toBeInTheDocument();

    expect(dispatch).toHaveBeenCalledTimes(0);
    expect(mockAxios).toHaveBeenCalledTimes(0);

    expect(screen.queryByText('general.loading')).toBeNull();

    await userEvent.click(screen.getByRole('button'));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledTimes(1);

    expect(screen.getByText('general.loading')).toBeInTheDocument();

    await act(() => {
      mockAxios.mockResponse({ data: { id: 'abc123' } });
    });

    expect(
      screen.getByText('You are now looking at the instance'),
    ).toBeInTheDocument();
  });
});
