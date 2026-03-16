import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { expect, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { InstanceApi } from 'src/core/api-client/instance.api';
import { FormProvider } from 'src/features/form/FormContext';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

const render = async () => {
  window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({
    onEntry: {
      show: 'stateless',
    },
  });
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
  it('should show button and it should be possible to click and navigate to instance', async () => {
    jest.mocked(InstanceApi.createWithPrefill).mockImplementation(async () => ({
      ...getInstanceDataMock(),
      id: 'abc123',
    }));

    await render();

    expect(screen.getByText('Instantiate')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByLabelText('Laster innhold')).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button'));

    expect(jest.mocked(InstanceApi.createWithPrefill)).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('You are now looking at the instance')).toBeInTheDocument();
    });
  });
});
