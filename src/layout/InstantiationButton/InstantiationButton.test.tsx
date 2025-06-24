import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { expect, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

const render = async () => {
  jest.mocked(fetchApplicationMetadata).mockImplementationOnce(async () =>
    getIncomingApplicationMetadataMock({
      onEntry: {
        show: 'stateless',
      },
    }),
  );
  return await renderGenericComponentTest({
    type: 'InstantiationButton',
    component: {
      textResourceBindings: {
        title: 'Instantiate',
      },
    },
    inInstance: false,
    initialPage: 'page1',
    router: ({ children }) => (
      <MemoryRouter
        basename='/ttd/test'
        initialEntries={['/ttd/test']}
      >
        <Routes>
          <Route
            path='/'
            element={children}
          />
          <Route
            path='/instance/abc123'
            element={<span>You are now looking at the instance</span>}
          />
        </Routes>
      </MemoryRouter>
    ),
    renderer: (props) => <InstantiationButtonComponent {...props} />,
  });
};

describe('InstantiationButton', () => {
  it('should show button and it should be possible to click and start loading', async () => {
    const { mutations } = await render();

    expect(screen.getByText('Instantiate')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByLabelText('Laster innhold')).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByLabelText('Laster innhold')).toBeInTheDocument();

    expect(mutations.doInstantiateWithPrefill.mock).toHaveBeenCalledTimes(1);

    mutations.doInstantiateWithPrefill.resolve({
      ...getInstanceDataMock(),
      id: 'abc123',
    });

    await waitFor(() => {
      expect(screen.getByText('You are now looking at the instance')).toBeInTheDocument();
    });
  });
});
