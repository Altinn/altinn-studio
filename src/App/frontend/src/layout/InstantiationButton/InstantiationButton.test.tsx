import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { expect, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { FormProvider } from 'src/features/form/FormContext';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

const render = async () => {
  jest.mocked(getApplicationMetadata).mockImplementation(() =>
    getApplicationMetadataMock({
      onEntry: {
        show: 'stateless',
      },
    }),
  );
  jest.mocked(useIsStateless).mockImplementation(() => true);
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
    renderer: (props) => (
      <FormProvider>
        <InstantiationButtonComponent {...props} />
      </FormProvider>
    ),
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
