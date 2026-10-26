import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { expect, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { FormProvider } from 'src/features/form/FormContext';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

const render = async (validity: { validFrom?: string; validTo?: string } = {}) => {
  jest.mocked(fetchApplicationMetadata).mockImplementationOnce(async () =>
    getIncomingApplicationMetadataMock({
      onEntry: {
        show: 'stateless',
      },
      ...validity,
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
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
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

  it('should explain that the service cannot be started, and disable the button, when validTo has passed', async () => {
    const { mutations } = await render({ validTo: '2020-01-01T00:00:00Z' });

    expect(await screen.findByText(/det er ikke mulig å starte nye skjema i denne tjenesten/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Instantiate' })).toBeDisabled();
    expect(mutations.doInstantiateWithPrefill.mock).not.toHaveBeenCalled();
  });

  it('should explain that the service cannot be started, and disable the button, after a 410 response', async () => {
    jest.spyOn(window, 'logError').mockImplementation(() => {});
    const { mutations } = await render();

    await userEvent.click(screen.getByRole('button', { name: 'Instantiate' }));
    await waitFor(() => expect(mutations.doInstantiateWithPrefill.mock).toHaveBeenCalledTimes(1));
    mutations.doInstantiateWithPrefill.reject(
      Object.assign(new Error('Gone'), { isAxiosError: true, response: { status: 410 } }),
    );

    expect(await screen.findByText(/det er ikke mulig å starte nye skjema i denne tjenesten/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Instantiate' })).toBeDisabled();
  });

  it('should say when the service opens, and disable the button, before validFrom', async () => {
    const { mutations } = await render({ validFrom: '2099-01-01T10:00:00Z' });

    expect(await screen.findByText(/Tjenesten åpner 01\.01\.2099/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Instantiate' })).toBeDisabled();
    expect(mutations.doInstantiateWithPrefill.mock).not.toHaveBeenCalled();
  });
});
