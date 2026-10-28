import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock, getLayoutSettingsMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { FormStore } from 'src/features/form/FormContext';
import { useProcessNextOutsideFormProvider } from 'src/features/instance/useProcessNext';
import { ActionButtonComponent } from 'src/layout/ActionButton/ActionButtonComponent';
import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { CustomButtonComponent } from 'src/layout/CustomButton/CustomButtonComponent';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { InputComponent } from 'src/layout/Input/InputComponent';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import { doProcessNext } from 'src/queries/queries';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { IProcess } from 'src/types/shared';

vi.mock('src/queries/queries', async () => ({
  ...(await vi.importActual<typeof import('src/queries/queries')>('src/queries/queries')),
  doProcessNext: vi.fn(),
}));

describe('FormProvider', () => {
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

describe("FormProvider on a service task's page", () => {
  const inputBinding = { dataType: defaultDataTypeMock, field: 'myInput' };

  /** The process the backend returns, which each test can change. */
  let process: IProcess;
  const getInstance = async (): Promise<IInstanceWithProcess> => ({ ...getInstanceWithProcessMock(), process });

  beforeEach(() => {
    process = getInstanceWithProcessMock().process;
    process.currentTask!.userActions = [
      { id: 'write', authorized: true, type: 'ProcessAction' },
      { id: 'reject', authorized: true, type: 'ProcessAction' },
      { id: 'lookupPerson', authorized: true, type: 'ServerAction' },
    ];
    vi.mocked(doProcessNext).mockReset();
  });

  function WriteProbe() {
    const setLeafValue = FormStore.data.useSetLeafValue();
    return (
      <button
        type='button'
        onClick={() => setLeafValue({ reference: inputBinding, newValue: 'written' })}
      >
        write-probe
      </button>
    );
  }

  function SubmitProbe() {
    const processNext = useProcessNextOutsideFormProvider();
    return (
      <button
        type='button'
        onClick={() => processNext.mutate()}
      >
        submit-probe
      </button>
    );
  }

  function makeTask1AServiceTask() {
    process.currentTask!.elementType = ELEMENT_TYPE.SERVICE_TASK;
    process.processTasks = [{ altinnTaskType: 'data', elementId: 'Task_1', elementType: ELEMENT_TYPE.SERVICE_TASK }];
  }

  async function renderInput(query?: string) {
    return await renderGenericComponentTest({
      type: 'Input',
      renderer: (props) => (
        <>
          <InputComponent {...props} />
          <WriteProbe />
          <SubmitProbe />
        </>
      ),
      component: { dataModelBindings: { simpleBinding: inputBinding } },
      query,
      apis: { instanceApi: { getInstance } },
    });
  }

  it.each(['idle', 'processing'] as const)(
    'renders inputs read-only and rejects writes while the workflow is %s',
    async (status) => {
      const user = userEvent.setup();
      const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
      makeTask1AServiceTask();
      process.workflow = { status };
      await renderInput();

      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
      await user.click(screen.getByRole('button', { name: 'write-probe' }));
      expect(logError).toHaveBeenCalledWith(`Tried to write to readOnly dataType "${defaultDataTypeMock}"`);
      expect(screen.getByRole('textbox')).toHaveValue('');
      logError.mockRestore();
    },
  );

  it("keeps a user task's page editable, also while process/next is pending", async () => {
    // The form is still being validated and saved for the request then
    const user = userEvent.setup();
    vi.mocked(doProcessNext).mockImplementation(() => new Promise(() => {}));
    await renderInput();

    await user.click(screen.getByRole('button', { name: 'submit-probe' }));
    await waitFor(() => expect(doProcessNext).toHaveBeenCalled());
    await user.type(screen.getByRole('textbox'), 'typed');
    expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly');
    expect(screen.getByRole('textbox')).toHaveValue('typed');
  });

  it('leaves PDF mode unaffected', async () => {
    makeTask1AServiceTask();
    process.workflow = { status: 'processing' };
    await renderInput('pdf=1');

    expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly');
  });

  it('disables the submit button', async () => {
    makeTask1AServiceTask();
    await renderGenericComponentTest({
      type: 'Button',
      renderer: (props) => <ButtonComponent {...props} />,
      component: { textResourceBindings: { title: 'Submit' } },
      apis: { instanceApi: { getInstance } },
    });

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('disables action buttons', async () => {
    makeTask1AServiceTask();
    await renderGenericComponentTest({
      type: 'ActionButton',
      renderer: (props) => <ActionButtonComponent {...props} />,
      component: { action: 'reject', buttonStyle: 'primary', textResourceBindings: { title: 'Reject' } },
      apis: { instanceApi: { getInstance } },
    });

    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
  });

  it('disables custom buttons with server actions', async () => {
    makeTask1AServiceTask();
    await renderGenericComponentTest({
      type: 'CustomButton',
      renderer: (props) => <CustomButtonComponent {...props} />,
      component: {
        textResourceBindings: { title: 'Look up' },
        actions: [
          { id: 'lookupPerson', type: 'ServerAction' },
          { id: 'nextPage', type: 'ClientAction' },
        ],
      },
      apis: { instanceApi: { getInstance } },
    });
    expect(screen.getByRole('button', { name: 'Look up' })).toBeDisabled();
  });

  it('keeps custom buttons that only navigate enabled', async () => {
    makeTask1AServiceTask();
    await renderGenericComponentTest({
      type: 'CustomButton',
      renderer: (props) => <CustomButtonComponent {...props} />,
      component: {
        textResourceBindings: { title: 'Next page' },
        actions: [{ id: 'nextPage', type: 'ClientAction' }],
      },
      apis: { instanceApi: { getInstance } },
    });
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });

  it('keeps page navigation working', async () => {
    makeTask1AServiceTask();
    window.altinnAppGlobalData.ui = getUiConfigMock(
      (obj) => (obj.folders.Task_1.pages = { order: ['page1', 'page2'] }),
    );
    const navigationButtons = { id: 'nav', type: 'NavigationButtons', textResourceBindings: {} } as const;
    await renderGenericComponentTest({
      type: 'NavigationButtons',
      renderer: (props) => <NavigationButtonsComponent {...props} />,
      component: navigationButtons,
      initialPage: 'page1',
      apis: { instanceApi: { getInstance } },
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.layouts = {
              page1: { data: { layout: [navigationButtons] } },
              page2: { data: { layout: [{ id: 'page2-heading', type: 'Heading', size: 'L' }] } },
            };
          }),
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Neste' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Neste' })).not.toBeInTheDocument());
  });
});
