import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

const render = async () =>
  await renderGenericComponentTest({
    type: 'InstantiationButton',
    component: {
      textResourceBindings: {
        title: 'Instantiate',
      },
    },
    inInstance: false,
    router: ({ children }) => (
      <MemoryRouter
        basename={'/ttd/test'}
        initialEntries={['/ttd/test/instance/1337/dfe95272-6873-48a6-abae-57b3f7c18689/Task_1/formLayout']}
      >
        <Routes>
          <Route
            path={'/instance/1337/dfe95272-6873-48a6-abae-57b3f7c18689/Task_1/formLayout'}
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
    queries: {
      fetchApplicationMetadata: async () => ({
        ...getApplicationMetadataMock(),
        onEntry: {
          show: 'stateless',
        },
      }),
    },
  });

describe('InstantiationButton', () => {
  it('should show button and it should be possible to click and start loading', async () => {
    const { mutations } = await render();

    expect(screen.getByText('Instantiate')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Laster innhold')).toBeInTheDocument();

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
