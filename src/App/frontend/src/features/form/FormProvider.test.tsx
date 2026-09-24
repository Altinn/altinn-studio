import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock, getLayoutSettingsMock } from 'src/__mocks__/getUiConfigMock';
import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import {
  InstanceRouter,
  renderGenericComponentTest,
  renderWithoutInstanceAndLayout,
} from 'src/test/renderWithProviders';
import type { IData } from 'src/types/shared';

describe('FormProvider', () => {
  it('loads the UI folder of a subform PDF service task with the subform being rendered', async () => {
    const subformIds = ['aaaaaaaa-1111-2222-3333-444444444444', 'bbbbbbbb-1111-2222-3333-444444444444'];
    const instance = getInstanceWithProcessMock();
    instance.data.push(...subformIds.map((id) => ({ ...instance.data[0], id, dataType: 'subform' }) as IData));
    window.altinnAppGlobalData.ui.folders.Task_SubformPdf = { defaultDataType: 'subform', pages: { order: ['Pdf'] } };
    const fetchFormBootstrapForInstance = vi.fn(async () => getFormBootstrapMock());

    await renderWithoutInstanceAndLayout({
      renderer: () => <div />,
      withFormProvider: true,
      waitUntilLoaded: false,
      router: ({ children }) => (
        <InstanceRouter
          initialPath={`/ttd/test/instance/${instance.id}/Task_SubformPdf/subform/subform-component/${subformIds[1]}`}
          query='pdf=1'
          alwaysRouteToChildren={true}
        >
          {children}
        </InstanceRouter>
      ),
      queries: { fetchFormBootstrapForInstance },
      apis: { instanceApi: { getInstance: async () => instance } },
    });

    await waitFor(() =>
      expect(fetchFormBootstrapForInstance).toHaveBeenCalledWith(
        expect.objectContaining({ uiFolder: 'Task_SubformPdf', dataElementId: subformIds[1], pdf: true }),
      ),
    );
  });

  it('does not change form data when a PDF renders a task other than the current one', async () => {
    window.altinnAppGlobalData.ui.folders.Task_Pdf = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
    const { formDataMethods } = await renderGenericComponentTest({
      type: 'Dropdown',
      renderer: (props) => <DropdownComponent {...props} />,
      component: {
        options: [
          { label: 'Norway', value: 'norway' },
          { label: 'Sweden', value: 'sweden' },
        ],
        preselectedOptionIndex: 1,
        dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'myDropdown' } },
      },
      taskId: 'Task_Pdf',
      query: 'pdf=1',
    });

    await screen.findByRole('combobox');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
  });

  it('rejects form data that a component writes when a PDF renders a task other than the current one', async () => {
    window.altinnAppGlobalData.ui.folders.Task_Pdf = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
    const logError = vi
      .spyOn(window, 'logError')
      .mockImplementation(() => {})
      .mockName('window.logError');
    const { mutations } = await renderGenericComponentTest({
      type: 'Address',
      renderer: (props) => <AddressComponent {...props} />,
      component: {
        simplified: true,
        dataModelBindings: {
          address: { dataType: defaultDataTypeMock, field: 'address' },
          zipCode: { dataType: defaultDataTypeMock, field: 'zipCode' },
          postPlace: { dataType: defaultDataTypeMock, field: 'postPlace' },
        },
      },
      taskId: 'Task_Pdf',
      query: 'pdf=1',
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = { address: 'a', zipCode: '0001', postPlace: 'Feil' };
          }),
      },
    });

    // Longer than the debounce timeout, so a changed value would have been saved
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
    expect(logError).toHaveBeenCalledWith(`Tried to write to readOnly dataType "${defaultDataTypeMock}"`);
    expect(screen.getByDisplayValue('Feil')).toBeInTheDocument();
    expect(mutations.doPatchMultipleFormData.mock).not.toHaveBeenCalled();
    logError.mockRestore();
  });
});
