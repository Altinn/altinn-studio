import { CustomReceipt } from './CustomReceipt';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { BpmnContext } from '../../../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { AppVersion } from 'app-shared/types/AppVersion';

const existingCustomReceiptLayoutSetId: string = mockBpmnApiContextValue.layoutSets[0].id;
const mockAllDataModelIds: string[] = [
  mockBpmnApiContextValue.layoutSets[0].dataType,
  mockBpmnApiContextValue.layoutSets[1].dataType,
];

const nameFieldLabel = textMock('process_editor.configuration_panel_custom_receipt_textfield_label');

const legacyVersion: AppVersion = { backendVersion: '8.9.0', frontendVersion: '4.25.2' };
const v9Version: AppVersion = { backendVersion: '9.0.0', frontendVersion: '4.25.2' };

const defaultBpmnApiContextProps: BpmnApiContextProps = {
  ...mockBpmnApiContextValue,
  existingCustomReceiptLayoutSetId: existingCustomReceiptLayoutSetId,
  allDataModelIds: mockAllDataModelIds,
};

describe('CustomReceipt', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the editable name field for apps older than v9', () => {
    renderCustomReceipt({ appVersion: legacyVersion });
    expect(screen.getByRole('button', { name: nameFieldLabel })).toBeInTheDocument();
  });

  it('does not render the name field from v9, where the name is fixed to the task name', () => {
    renderCustomReceipt({ appVersion: v9Version });
    expect(screen.queryByRole('button', { name: nameFieldLabel })).not.toBeInTheDocument();
  });

  it('calls "deleteLayoutSet" when clicking the delete button', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderCustomReceipt({ appVersion: v9Version });

    const deleteButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_delete_button'),
    });
    await user.click(deleteButton);

    expect(mockBpmnApiContextValue.deleteLayoutSet).toHaveBeenCalledTimes(1);
    expect(mockBpmnApiContextValue.deleteLayoutSet).toHaveBeenCalledWith({
      layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
    });
  });

  it('calls "mutateDataTypes" when the data model id is changed', async () => {
    const user = userEvent.setup();
    renderCustomReceipt({ appVersion: v9Version });

    const propertyButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_model', {
        dataModelName: mockBpmnApiContextValue.layoutSets[0].dataType,
      }),
    });
    await user.click(propertyButton);

    const combobox = screen.getByRole('combobox', {
      name: /process_editor\.configuration_panel_set_data_model_label/,
    });
    const newOption: string = mockAllDataModelIds[1];
    await user.type(combobox, newOption);
    const option = await screen.findByRole('option', { name: newOption, hidden: true });
    await user.click(option);

    expect(mockBpmnApiContextValue.mutateDataTypes).toHaveBeenCalledTimes(1);
    expect(mockBpmnApiContextValue.mutateDataTypes).toHaveBeenCalledWith({
      connectedTaskId: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
      newDataTypes: [newOption],
    });
  });
});

type RenderProps = {
  appVersion: AppVersion;
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
};

const renderCustomReceipt = ({ appVersion, bpmnApiContextProps }: Partial<RenderProps> = {}) => {
  const queryClient = createQueryClientMock();
  return render(
    <TestAppRouter>
      <ServicesContextProvider {...queriesMock} client={queryClient}>
        <BpmnApiContext.Provider value={{ ...defaultBpmnApiContextProps, ...bpmnApiContextProps }}>
          <BpmnContext.Provider
            value={{
              ...mockBpmnContextValue,
              appVersion: appVersion ?? mockBpmnContextValue.appVersion,
            }}
          >
            <BpmnConfigPanelFormContextProvider>
              <CustomReceipt />
            </BpmnConfigPanelFormContextProvider>
          </BpmnContext.Provider>
        </BpmnApiContext.Provider>
      </ServicesContextProvider>
    </TestAppRouter>,
  );
};
