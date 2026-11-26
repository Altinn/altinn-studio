import { useState } from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock, getLayoutSettingsMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { FormStore } from 'src/features/form/FormContext';
import { useProcessNextOutsideFormProvider } from 'src/features/process/useProcessNext';
import { ActionButtonComponent } from 'src/layout/ActionButton/ActionButtonComponent';
import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { CustomButtonComponent } from 'src/layout/CustomButton/CustomButtonComponent';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { InputComponent } from 'src/layout/Input/InputComponent';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { AppQueriesContext } from 'src/core/queries/types';
import type { IProcess } from 'src/types/shared';

const inputBinding = { dataType: defaultDataTypeMock, field: 'myInput' };

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

describe('FormProvider writes to a data model', () => {
  it.each([
    { writable: false, locked: false, accepted: false },
    { writable: true, locked: true, accepted: true },
  ])(
    'follow the bootstrap response, not the data element lock (writable: $writable, locked: $locked)',
    async ({ writable, locked, accepted }) => {
      const user = userEvent.setup();
      const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
      await renderGenericComponentTest({
        type: 'Input',
        renderer: (props) => (
          <>
            <InputComponent {...props} />
            <WriteProbe />
          </>
        ),
        component: { dataModelBindings: { simpleBinding: inputBinding } },
        queries: {
          getInstance: async () => {
            const instance = getInstanceWithProcessMock();
            instance.data.forEach((element) => (element.locked = locked));
            return instance;
          },
          fetchFormBootstrapForInstance: async () =>
            getFormBootstrapMock((obj) => {
              obj.dataModels[defaultDataTypeMock].writable = writable;
            }),
        },
      });

      await user.click(screen.getByRole('button', { name: 'write-probe' }));
      expect(screen.getByRole('textbox')).toHaveValue(accepted ? 'written' : '');
      if (accepted) {
        expect(logError).not.toHaveBeenCalled();
      } else {
        expect(logError).toHaveBeenCalledWith(`Tried to write to readOnly dataType "${defaultDataTypeMock}"`);
      }
      logError.mockRestore();
    },
  );
});

const doProcessNext = vi.fn<AppQueriesContext['doProcessNext']>();

/** The process the backend returns, which each test can change. */
let process: IProcess;
const getInstance = async (): Promise<IInstanceWithProcess> => ({ ...getInstanceWithProcessMock(), process });

function resetProcess() {
  process = getInstanceWithProcessMock().process;
  process.currentTask!.userActions = [
    { id: 'write', authorized: true, type: 'ProcessAction' },
    { id: 'reject', authorized: true, type: 'ProcessAction' },
    { id: 'lookupPerson', authorized: true, type: 'ServerAction' },
  ];
  vi.mocked(doProcessNext).mockReset();
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

function WaitForSaveProbe() {
  const waitForSave = FormStore.data.useWaitForSave();
  const [hasWaited, setHasWaited] = useState(false);
  return (
    <button
      type='button'
      onClick={async () => {
        await waitForSave(true);
        setHasWaited(true);
      }}
    >
      {hasWaited ? 'waited-for-save' : 'wait-for-save-probe'}
    </button>
  );
}

async function renderInput(query?: string) {
  return await renderGenericComponentTest({
    type: 'Input',
    renderer: (props) => (
      <>
        <InputComponent {...props} />
        <WriteProbe />
        <SubmitProbe />
        <WaitForSaveProbe />
      </>
    ),
    component: { dataModelBindings: { simpleBinding: inputBinding } },
    query,
    queries: { getInstance },
    mutations: { doProcessNext },
  });
}

describe("FormProvider on a service task's page", () => {
  beforeEach(resetProcess);

  function makeTask1AServiceTask() {
    process.currentTask!.elementType = ELEMENT_TYPE.SERVICE_TASK;
    process.processTasks = [{ altinnTaskType: 'data', elementId: 'Task_1', elementType: ELEMENT_TYPE.SERVICE_TASK }];
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
      queries: { getInstance },
    });

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('disables action buttons', async () => {
    makeTask1AServiceTask();
    await renderGenericComponentTest({
      type: 'ActionButton',
      renderer: (props) => <ActionButtonComponent {...props} />,
      component: { action: 'reject', buttonStyle: 'primary', textResourceBindings: { title: 'Reject' } },
      queries: { getInstance },
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
      queries: { getInstance },
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
      queries: { getInstance },
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
      queries: {
        getInstance,
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

describe("FormProvider on a user task's page that a user action holds", () => {
  const hold: IProcess['workflow'] = { status: 'processing', targetTask: 'Task_1', awaitingMessages: true };

  beforeEach(resetProcess);

  /** Lets the page read the process now, instead of at the next poll. */
  async function changeWorkflow(workflow: IProcess['workflow']) {
    process = { ...process, workflow };
    await act(async () => {
      await window.queryClient.refetchQueries({ queryKey: ['instanceData'] });
    });
  }

  /** Longer than the debounce timeout, so a changed value would have been saved */
  async function waitLongerThanTheDebounce() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
  }

  it('renders the page read-only and rejects writes while the action waits for messages', async () => {
    const user = userEvent.setup();
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    process.workflow = hold;
    await renderInput();

    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'write-probe' }));
    expect(logError).toHaveBeenCalledWith(`Tried to write to readOnly dataType "${defaultDataTypeMock}"`);
    logError.mockRestore();
  });

  it('makes the page editable when the action lets the instance go', async () => {
    const user = userEvent.setup();
    process.workflow = hold;
    await renderInput();
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');

    process = { ...process, workflow: { status: 'idle' } };
    await waitFor(() => expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly'), { timeout: 5000 });
    await user.type(screen.getByRole('textbox'), 'typed');
    expect(screen.getByRole('textbox')).toHaveValue('typed');
  });

  it('keeps what the user typed and saved when the hold starts and ends', async () => {
    const user = userEvent.setup();
    const { mutations } = await renderInput();
    await user.type(screen.getByRole('textbox'), 'typed');
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalled(), { timeout: 5000 });

    await changeWorkflow(hold);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveAttribute('readonly'));
    expect(screen.getByRole('textbox')).toHaveValue('typed');

    process = { ...process, workflow: { status: 'idle' } };
    await waitFor(() => expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly'), { timeout: 5000 });
    expect(screen.getByRole('textbox')).toHaveValue('typed');
  });

  it('saves what the user typed just before the hold started once, after the action lets the instance go', async () => {
    const user = userEvent.setup();
    const { mutations } = await renderInput();
    await user.type(screen.getByRole('textbox'), 'x');
    await changeWorkflow(hold);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveAttribute('readonly'));

    await waitLongerThanTheDebounce();
    expect(mutations.doPatchMultipleFormData.mock).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('x');

    await changeWorkflow({ status: 'idle' });
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalledTimes(1));
    expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        patches: [expect.objectContaining({ patch: [expect.objectContaining({ value: 'x' })] })],
      }),
    );
  });

  it('does not wait for a save of unsaved changes while the action holds the page', async () => {
    const user = userEvent.setup();
    const { mutations } = await renderInput();
    await user.type(screen.getByRole('textbox'), 'x');
    await changeWorkflow(hold);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveAttribute('readonly'));

    await user.click(screen.getByRole('button', { name: 'wait-for-save-probe' }));
    expect(await screen.findByRole('button', { name: 'waited-for-save' })).toBeInTheDocument();
    expect(mutations.doPatchMultipleFormData.mock).not.toHaveBeenCalled();
  });

  it('sends no save of unsaved changes when the held page closes', async () => {
    const user = userEvent.setup();
    const { mutations, unmount } = await renderInput();
    await user.type(screen.getByRole('textbox'), 'x');
    await changeWorkflow(hold);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveAttribute('readonly'));

    unmount();
    await waitLongerThanTheDebounce();
    expect(mutations.doPatchMultipleFormData.mock).not.toHaveBeenCalled();
  });

  it('runs the effects that write to the data model only after the action lets the instance go', async () => {
    process.workflow = hold;
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
      queries: { getInstance },
    });

    await screen.findByRole('combobox');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();

    await changeWorkflow({ status: 'idle' });
    await waitFor(() =>
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith(
        expect.objectContaining({ reference: expect.objectContaining({ field: 'myDropdown' }), newValue: 'sweden' }),
      ),
    );
  });
});
