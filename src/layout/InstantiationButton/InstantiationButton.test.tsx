import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import mockAxios from 'jest-mock-axios';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import { setupStore } from 'src/store';
import { mockComponentProps, renderWithProviders } from 'src/testUtils';

const render = () => {
  const stateMock = getInitialStateMock();
  const store = setupStore(stateMock);

  const spy = jest.spyOn(store, 'dispatch');

  renderWithProviders(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path={'/'}
          element={<InstantiationButton {...mockComponentProps}>Instantiate</InstantiationButton>}
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
    const dispatch = render();
    expect(screen.getByText('Instantiate')).toBeInTheDocument();

    expect(dispatch).toHaveBeenCalledTimes(0);
    expect(mockAxios).toHaveBeenCalledTimes(0);

    expect(screen.queryByText('general.loading')).toBeNull();

    await act(() => userEvent.click(screen.getByRole('button')));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledTimes(1);

    expect(screen.getByText('general.loading')).toBeInTheDocument();

    await act(() => {
      mockAxios.mockResponse({ data: { id: 'abc123' } });
    });

    expect(screen.getByText('You are now looking at the instance')).toBeInTheDocument();
  });
});
