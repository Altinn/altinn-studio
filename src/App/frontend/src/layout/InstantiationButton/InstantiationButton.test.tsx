import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { IQueryParameters } from '@app/layout-contract/generated/common.generated';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getDataModelBootstrapMock, getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { statelessDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { FormProvider } from 'src/features/form/FormProvider';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { InstanceApi } from 'src/core/api-client/instance.api';

const render = async (createWithPrefill: InstanceApi['createWithPrefill'], queryParameters?: IQueryParameters) => {
  window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({
    onEntry: {
      show: 'stateless',
    },
  });
  return await renderGenericComponentTest({
    type: 'InstantiationButton',
    component: {
      queryParameters,
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
    queries: {
      fetchFormBootstrapForStateless: async () =>
        getFormBootstrapMock((obj) => {
          obj.dataModels[statelessDataTypeMock] = getDataModelBootstrapMock({ initialData: { name: 'Ada' } });
        }),
    },
    apis: {
      instanceApi: {
        createWithPrefill,
      },
    },
  });
};

describe('InstantiationButton', () => {
  it('resolves query parameter expressions into instantiation prefill', async () => {
    const createWithPrefill = vi.fn(async () => ({
      ...getInstanceDataMock(),
      id: '512345/abc123',
      process: getProcessDataMock(),
    }));
    await render(createWithPrefill, {
      name: ['concat', ['dataModel', 'name'], ' Lovelace'],
      source: 'stateless',
    });
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(createWithPrefill).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ prefill: { name: 'Ada Lovelace', source: 'stateless' } }),
        }),
      ),
    );
  });

  it('should show button and it should be possible to click and start loading', async () => {
    const createWithPrefillMock = vi.fn(async () => ({
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
