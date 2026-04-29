import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { FormProvider } from 'src/features/form/FormProvider';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { InstanceApi } from 'src/core/api-client/instance.api';

const render = async (createWithPrefill: InstanceApi['createWithPrefill']) => {
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
            path='/instance/512345/abc123'
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
    apis: {
      instanceApi: {
        createWithPrefill,
      },
    },
  });
};

describe('InstantiationButton', () => {
  it('should show button and it should be possible to click and start loading', async () => {
    const createWithPrefillMock = jest.fn(async () => ({
      ...getInstanceDataMock(),
      id: '512345/abc123',
      process: getProcessDataMock(),
    }));

    await render(createWithPrefillMock);

    expect(screen.getByText('Instantiate')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByLabelText('Laster innhold')).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button'));

    expect(createWithPrefillMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('You are now looking at the instance')).toBeInTheDocument();
    });
  });
});
