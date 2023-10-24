import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import mockAxios from 'jest-mock-axios';

import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

const render = () => {
  renderGenericComponentTest({
    type: 'InstantiationButton',
    component: {
      textResourceBindings: {
        title: 'Instantiate',
      },
    },
    renderer: (props) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path={'/'}
            element={<InstantiationButtonComponent {...props} />}
          />
          <Route
            path='/instance/abc123'
            element={<span>You are now looking at the instance</span>}
          />
        </Routes>
      </MemoryRouter>
    ),
  });
};

describe('InstantiationButton', () => {
  it('should show button and it should be possible to click and start loading', async () => {
    mockAxios.reset();
    render();
    expect(screen.getByText('Instantiate')).toBeInTheDocument();

    expect(mockAxios).toHaveBeenCalledTimes(0);

    expect(screen.queryByText('Laster innhold')).toBeNull();

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(() => userEvent.click(screen.getByRole('button')));

    expect(mockAxios).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Laster innhold')).toBeInTheDocument();

    await act(() => {
      mockAxios.mockResponse({ data: { id: 'abc123' } });
    });

    expect(screen.getByText('You are now looking at the instance')).toBeInTheDocument();
  });
});
